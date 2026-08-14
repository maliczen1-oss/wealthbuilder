"""
ATLAS CERTIFICATION HEADER

name=services/history_service.py
Version: 2.0.0

Purpose
-------
Production-grade historical trade normalization service for WealthBuilder OS.

Responsibilities
----------------
- Preserve the existing get_history() public interface.
- Retrieve both broker history deals and history orders.
- Preserve all broker-native fields.
- Preserve exact broker-native symbols.
- Normalize timestamp fields to UTC ISO-8601.
- Generate deterministic record identities.
- Deduplicate deals and orders.
- Apply one deterministic total result limit.
- Isolate deal-query and order-query failures.
- Correctly represent empty history.
- Add record_type metadata.
- Add learning-oriented normalized fields.
- Maintain compatibility with /api/history.
- Produce deterministic, machine-learning-ready historical records.

Learning Design
---------------
The service deliberately does NOT attempt to decide whether a trade was
profitable, good, bad, optimal, or predictive.

It prepares clean historical observations for the future Jarvis learning
engine while preserving the original broker data required for later feature
engineering.

Production Certification: Atlas Phase 2.0
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import logging
import math
from typing import Any, Dict, Iterable, List, Optional, Tuple

from core.connection_manager import manager as connection_manager


logger = logging.getLogger("bridge")


# ============================================================================
# Constants
# ============================================================================

UTC = dt.timezone.utc

DEFAULT_LIMIT = 1000

# Keys which are strongly associated with timestamp values.
#
# This is intentionally conservative. We do not blindly convert every number
# containing the word "time" because broker payloads can contain unrelated
# numeric fields.
_TIMESTAMP_KEY_NAMES = {
    "time",
    "time_msc",
    "timestamp",
    "created_at",
    "createdAt",
    "updated_at",
    "updatedAt",
    "time_done",
    "timeDone",
    "time_setup",
    "timeSetup",
    "time_expiration",
    "timeExpiration",
    "expiration",
    "expiration_time",
    "expirationTime",
    "open_time",
    "openTime",
    "close_time",
    "closeTime",
    "execution_time",
    "executionTime",
    "done_time",
    "doneTime",
}

_TIMESTAMP_KEY_PARTS = (
    "timestamp",
    "_at",
    "time_msc",
    "time_done",
    "time_setup",
    "time_expiration",
)


# ============================================================================
# Basic defensive helpers
# ============================================================================

def _safe_list(value: Any) -> List[Dict[str, Any]]:
    """
    Return only dictionary records from an upstream collection.

    MT5/MetaApi clients should normally return dictionaries, but this service
    must never allow malformed upstream entries to break the complete history
    response.
    """
    if not isinstance(value, (list, tuple)):
        return []

    return [
        dict(item)
        for item in value
        if isinstance(item, dict)
    ]


def _safe_int(value: Any) -> Optional[int]:
    """Convert an integer-like value safely."""
    if value is None or isinstance(value, bool):
        return None

    try:
        return int(value)
    except (TypeError, ValueError, OverflowError):
        return None


def _safe_float(value: Any) -> Optional[float]:
    """Convert a numeric value safely while rejecting NaN/Infinity."""
    if value is None or isinstance(value, bool):
        return None

    try:
        number = float(value)

        if not math.isfinite(number):
            return None

        return number

    except (TypeError, ValueError, OverflowError):
        return None


def _clean_symbol(value: Any) -> Optional[str]:
    """
    Preserve the broker-native symbol exactly apart from surrounding
    whitespace.

    Examples:
        EURUSD.mic
        XAUUSD.mic
        USTECH.mic
        DE30.mic

    No broker suffix is stripped and no symbol is renamed.
    """
    if value is None:
        return None

    symbol = str(value).strip()

    return symbol or None


# ============================================================================
# Timestamp normalization
# ============================================================================

def _is_timestamp_key(key: str) -> bool:
    """
    Determine whether a dictionary key is sufficiently timestamp-like to
    warrant normalization.
    """
    if key in _TIMESTAMP_KEY_NAMES:
        return True

    lowered = key.lower()

    if lowered in {
        "time",
        "timestamp",
        "datetime",
        "date",
    }:
        return True

    return any(
        part in lowered
        for part in _TIMESTAMP_KEY_PARTS
    )


def _datetime_to_utc_iso(value: dt.datetime) -> str:
    """
    Convert datetime to canonical UTC ISO-8601.

    Example:
        2026-08-13T21:15:30.123456Z
    """
    if value.tzinfo is None:
        # Broker/MT5 datetime values are interpreted as UTC when no timezone
        # information is supplied. This avoids silently applying the Railway
        # host's local timezone.
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)

    return (
        value
        .isoformat(timespec="microseconds")
        .replace("+00:00", "Z")
    )


def _timestamp_to_utc_iso(value: Any) -> Optional[str]:
    """
    Normalize common MT5/MetaApi timestamp representations.

    Supported:
    - datetime
    - UNIX seconds
    - UNIX milliseconds
    - ISO-8601 strings
    - ISO-8601 strings ending in Z
    """
    if value is None:
        return None

    if isinstance(value, dt.datetime):
        return _datetime_to_utc_iso(value)

    # MT5 commonly exposes:
    #   time     -> seconds
    #   time_msc -> milliseconds
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            number = float(value)

            if not math.isfinite(number):
                return None

            # 13-digit-ish timestamps are milliseconds.
            if abs(number) >= 100_000_000_000:
                number /= 1000.0

            return _datetime_to_utc_iso(
                dt.datetime.fromtimestamp(
                    number,
                    tz=UTC,
                )
            )

        except (OverflowError, OSError, ValueError):
            return None

    if isinstance(value, str):
        raw = value.strip()

        if not raw:
            return None

        # Numeric timestamp represented as a string.
        try:
            numeric = float(raw)

            if math.isfinite(numeric):
                return _timestamp_to_utc_iso(numeric)

        except (TypeError, ValueError):
            pass

        iso_value = raw

        # Python's fromisoformat accepts +00:00 but not Z on older versions.
        if iso_value.endswith("Z"):
            iso_value = iso_value[:-1] + "+00:00"

        try:
            parsed = dt.datetime.fromisoformat(
                iso_value
            )

            return _datetime_to_utc_iso(parsed)

        except ValueError:
            return None

    return None


def _normalize_timestamps(
    value: Any,
    *,
    parent_key: Optional[str] = None,
) -> Any:
    """
    Recursively normalize timestamp fields.

    Original broker fields are retained. When a timestamp is changed from its
    broker representation into canonical UTC ISO-8601, the original value is
    retained under '<field>_raw'.

    This allows Jarvis to learn from canonical timestamps without losing
    broker-native evidence.
    """
    if isinstance(value, dict):

        result: Dict[str, Any] = {}

        for key, item in value.items():

            key_string = str(key)

            if _is_timestamp_key(key_string):

                normalized = _timestamp_to_utc_iso(item)

                if normalized is not None:

                    # Preserve the broker-native timestamp value.
                    result[f"{key_string}_raw"] = item

                    # Canonical learning/API representation.
                    result[key_string] = normalized

                    continue

            result[key_string] = _normalize_timestamps(
                item,
                parent_key=key_string,
            )

        return result

    if isinstance(value, list):
        return [
            _normalize_timestamps(
                item,
                parent_key=parent_key,
            )
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            _normalize_timestamps(
                item,
                parent_key=parent_key,
            )
            for item in value
        ]

    return value


# ============================================================================
# Stable serialization / deterministic identity
# ============================================================================

def _json_safe(value: Any) -> Any:
    """
    Convert unusual broker values into deterministic JSON-compatible values.

    This is used only for identity generation and never replaces the original
    broker record.
    """
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    if isinstance(value, (str, int)):
        return value

    if isinstance(value, float):
        if math.isfinite(value):
            return value

        return str(value)

    if isinstance(value, dt.datetime):
        return _datetime_to_utc_iso(value)

    if isinstance(value, dict):
        return {
            str(key): _json_safe(item)
            for key, item in sorted(
                value.items(),
                key=lambda pair: str(pair[0]),
            )
        }

    if isinstance(value, (list, tuple)):
        return [
            _json_safe(item)
            for item in value
        ]

    return str(value)


def _canonical_json(value: Any) -> str:
    """Create deterministic JSON suitable for hashing."""
    return json.dumps(
        _json_safe(value),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def _first_present(
    record: Dict[str, Any],
    keys: Iterable[str],
) -> Any:
    """Return the first non-None value for the supplied keys."""
    for key in keys:

        if key in record and record[key] is not None:
            return record[key]

    return None


def _identity_source(
    record: Dict[str, Any],
    record_type: str,
) -> Dict[str, Any]:
    """
    Construct the stable identity source.

    Primary identity comes from broker identifiers whenever available.

    If no broker identifier exists, the complete normalized record is hashed
    after removing fields which are known to be volatile or operational.
    """
    broker_id = _first_present(
        record,
        (
            "ticket",
            "id",
            "dealId",
            "orderId",
            "positionId",
            "brokerTicket",
        ),
    )

    symbol = _clean_symbol(
        record.get("symbol")
    )

    if broker_id is not None:

        return {
            "record_type": record_type,
            "broker_id": str(broker_id),
            "symbol": symbol,
        }

    # Fallback identity for brokers that do not expose a ticket/id.
    excluded = {
        "record_id",
        "record_type",
        "learning",
        "_history_service",
    }

    stable_record = {
        key: value
        for key, value in record.items()
        if key not in excluded
        and not key.endswith("_raw")
    }

    return {
        "record_type": record_type,
        "symbol": symbol,
        "record": stable_record,
    }


def _record_id(
    record: Dict[str, Any],
    record_type: str,
) -> str:
    """
    Generate a deterministic SHA-256 record identity.

    Prefixes make the identity human-readable while retaining a fixed-size
    collision-resistant hash.
    """
    source = _canonical_json(
        _identity_source(
            record,
            record_type,
        )
    )

    digest = hashlib.sha256(
        source.encode("utf-8")
    ).hexdigest()

    return f"{record_type}_{digest}"


# ============================================================================
# Timestamp / sorting helpers
# ============================================================================

def _event_timestamp(record: Dict[str, Any]) -> str:
    """
    Return the best normalized event timestamp.

    The result is always an ISO string when available, otherwise an empty
    string so sorting remains deterministic.
    """
    candidates = (
        "time",
        "time_done",
        "time_setup",
        "timestamp",
        "created_at",
        "createdAt",
        "updated_at",
        "updatedAt",
        "open_time",
        "openTime",
        "close_time",
        "closeTime",
        "execution_time",
        "executionTime",
    )

    for key in candidates:

        value = record.get(key)

        if isinstance(value, str):
            normalized = _timestamp_to_utc_iso(value)

            if normalized:
                return normalized

    return ""


def _record_sort_key(
    record: Dict[str, Any],
) -> Tuple[str, str, str]:
    """
    Deterministic newest-first ordering.

    Ties are resolved by record type and record_id.
    """
    return (
        _event_timestamp(record),
        str(record.get("record_type") or ""),
        str(record.get("record_id") or ""),
    )


# ============================================================================
# Learning normalization
# ============================================================================

def _direction(record: Dict[str, Any]) -> Optional[str]:
    """
    Normalize broker direction/type without changing the broker-native value.
    """
    value = _first_present(
        record,
        (
            "type",
            "side",
            "action",
            "direction",
            "entryType",
        ),
    )

    if value is None:
        return None

    text = str(value).strip().upper()

    if any(
        token in text
        for token in (
            "BUY",
            "LONG",
        )
    ):
        return "BUY"

    if any(
        token in text
        for token in (
            "SELL",
            "SHORT",
        )
    ):
        return "SELL"

    return text or None


def _entry_role(record: Dict[str, Any]) -> Optional[str]:
    """
    Normalize common MT5/MetaApi entry semantics.

    This intentionally does not infer an entry/exit when the broker has not
    provided enough evidence.
    """
    value = _first_present(
        record,
        (
            "entry",
            "dealType",
            "entryType",
        ),
    )

    if value is None:
        return None

    text = str(value).strip().upper()

    mapping = {
        "0": "IN",
        "1": "OUT",
        "2": "INOUT",
        "3": "OUT_BY",
        "IN": "IN",
        "OUT": "OUT",
        "INOUT": "INOUT",
        "OUT_BY": "OUT_BY",
    }

    return mapping.get(
        text,
        text,
    )


def _learning_fields(
    record: Dict[str, Any],
    record_type: str,
) -> Dict[str, Any]:
    """
    Produce stable, non-destructive features for future Jarvis learning.

    These fields are deliberately descriptive rather than predictive.
    """
    symbol = _clean_symbol(
        record.get("symbol")
    )

    profit = _safe_float(
        record.get("profit")
    )

    commission = _safe_float(
        record.get("commission")
    )

    swap = _safe_float(
        record.get("swap")
    )

    volume = _safe_float(
        _first_present(
            record,
            (
                "volume",
                "lots",
                "volumeLots",
            ),
        )
    )

    price = _safe_float(
        _first_present(
            record,
            (
                "price",
                "openPrice",
                "currentPrice",
            ),
        )
    )

    return {
        "record_type": record_type,

        "symbol": symbol,

        "direction": _direction(record),

        "entry_role": _entry_role(record),

        "ticket": _first_present(
            record,
            (
                "ticket",
                "dealId",
                "orderId",
                "id",
            ),
        ),

        "event_time_utc": _event_timestamp(
            record
        ),

        "volume": volume,

        "price": price,

        "profit": profit,

        "commission": commission,

        "swap": swap,

        "net_profit": (
            profit
            - (commission or 0.0)
            + (swap or 0.0)
            if profit is not None
            else None
        ),

        "has_profit": profit is not None,

        "is_profitable": (
            profit > 0
            if profit is not None
            else None
        ),

        "is_loss": (
            profit < 0
            if profit is not None
            else None
        ),

        "has_symbol": bool(symbol),

        "has_price": price is not None,

        "has_volume": volume is not None,

        "broker_comment": _first_present(
            record,
            (
                "comment",
                "reason",
            ),
        ),
    }


# ============================================================================
# Record normalization
# ============================================================================

def _normalize_record(
    source: Dict[str, Any],
    record_type: str,
) -> Optional[Dict[str, Any]]:
    """
    Normalize a single broker record without destroying its broker-native
    payload.
    """
    if not isinstance(source, dict):
        return None

    # First preserve everything and normalize timestamps recursively.
    record = _normalize_timestamps(
        dict(source)
    )

    # Preserve exact broker-native symbol.
    if "symbol" in source:
        record["symbol"] = _clean_symbol(
            source.get("symbol")
        )

    # Explicit record type.
    record["record_type"] = record_type

    # Deterministic identity.
    record["record_id"] = _record_id(
        record,
        record_type,
    )

    # Learning-oriented fields live under a dedicated namespace so they
    # cannot overwrite broker fields.
    record["learning"] = _learning_fields(
        record,
        record_type,
    )

    # Service metadata is intentionally minimal.
    record["_history_service"] = {
        "version": "2.0.0",
        "timestamp_normalized": True,
        "broker_fields_preserved": True,
    }

    return record


def _deduplicate(
    records: Iterable[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Remove duplicate records deterministically using record_id."""
    seen: set[str] = set()
    result: List[Dict[str, Any]] = []

    for record in records:

        record_id = str(
            record.get("record_id") or ""
        )

        if not record_id:
            # Defensive fallback. A normalized record should always have an
            # identity, but malformed input must never crash the service.
            continue

        if record_id in seen:
            continue

        seen.add(record_id)
        result.append(record)

    return result


# ============================================================================
# Query helpers
# ============================================================================

def _fetch_deals(
    from_dt: dt.datetime,
    to_dt: dt.datetime,
    ticket: Optional[int],
    symbol: Optional[str],
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Fetch and normalize deals.

    Failure is isolated from orders.
    """
    try:

        raw = connection_manager.fetch_history_deals(
            from_dt,
            to_dt,
            ticket=ticket,
            symbol=symbol,
        )

        return (
            _safe_list(raw),
            None,
        )

    except Exception as exc:

        logger.exception(
            "Failed to fetch history deals: %s",
            exc,
        )

        return (
            [],
            str(exc),
        )


def _fetch_orders(
    from_dt: dt.datetime,
    to_dt: dt.datetime,
    ticket: Optional[int],
    symbol: Optional[str],
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Fetch and normalize orders.

    Failure is isolated from deals.
    """
    try:

        raw = connection_manager.fetch_history_orders(
            from_dt,
            to_dt,
            ticket=ticket,
            symbol=symbol,
        )

        return (
            _safe_list(raw),
            None,
        )

    except Exception as exc:

        logger.exception(
            "Failed to fetch history orders: %s",
            exc,
        )

        return (
            [],
            str(exc),
        )


# ============================================================================
# Public service interface
# ============================================================================

def get_history(
    from_dt: dt.datetime,
    to_dt: dt.datetime,
    ticket: Optional[int] = None,
    symbol: Optional[str] = None,
    limit: Optional[int] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Return historical deals and orders within the requested date range.

    Public interface is intentionally unchanged.

    Parameters
    ----------
    from_dt:
        Beginning of the history window.

    to_dt:
        End of the history window.

    ticket:
        Optional broker ticket filter.

    symbol:
        Optional exact broker-native symbol filter.

    limit:
        One total deterministic limit applied AFTER deals and orders have
        been combined, normalized, sorted and deduplicated.

    Returns
    -------
    dict
        {
            "deals": [...],
            "orders": [...]
        }

    Compatibility
    -------------
    Existing callers can continue using:

        history_service.get_history(...)

    and /api/history can continue returning:

        {
            "deals": [...],
            "orders": [...]
        }

    Additional fields are additive and do not remove broker-native fields.
    """

    logger.info(
        (
            "History request from=%s to=%s "
            "ticket=%s symbol=%s limit=%s"
        ),
        (
            from_dt.isoformat()
            if isinstance(from_dt, dt.datetime)
            else from_dt
        ),
        (
            to_dt.isoformat()
            if isinstance(to_dt, dt.datetime)
            else to_dt
        ),
        ticket,
        symbol,
        limit,
    )

    # ----------------------------------------------------------------------
    # Validate / normalize limit
    # ----------------------------------------------------------------------

    total_limit: Optional[int]

    if limit is None:
        total_limit = None

    elif isinstance(limit, int) and not isinstance(limit, bool):

        if limit <= 0:
            total_limit = None

        else:
            total_limit = min(
                limit,
                DEFAULT_LIMIT,
            )

    else:
        total_limit = None

    # ----------------------------------------------------------------------
    # Preserve exact broker-native symbol
    # ----------------------------------------------------------------------

    requested_symbol = (
        symbol.strip()
        if isinstance(symbol, str)
        else symbol
    )

    # ----------------------------------------------------------------------
    # Independent upstream queries
    # ----------------------------------------------------------------------

    raw_deals, deals_error = _fetch_deals(
        from_dt,
        to_dt,
        ticket,
        requested_symbol,
    )

    raw_orders, orders_error = _fetch_orders(
        from_dt,
        to_dt,
        ticket,
        requested_symbol,
    )

    # ----------------------------------------------------------------------
    # Normalize independently
    # ----------------------------------------------------------------------

    normalized_deals = [
        normalized
        for item in raw_deals
        for normalized in [
            _normalize_record(
                item,
                "deal",
            )
        ]
        if normalized is not None
    ]

    normalized_orders = [
        normalized
        for item in raw_orders
        for normalized in [
            _normalize_record(
                item,
                "order",
            )
        ]
        if normalized is not None
    ]

    # ----------------------------------------------------------------------
    # Deduplicate independently
    # ----------------------------------------------------------------------

    normalized_deals = _deduplicate(
        normalized_deals
    )

    normalized_orders = _deduplicate(
        normalized_orders
    )

    # ----------------------------------------------------------------------
    # Combine for deterministic TOTAL limit
    # ----------------------------------------------------------------------

    combined: List[Dict[str, Any]] = (
        normalized_deals
        + normalized_orders
    )

    combined.sort(
        key=_record_sort_key,
        reverse=True,
    )

    if total_limit is not None:
        combined = combined[
            :total_limit
        ]

    # ----------------------------------------------------------------------
    # Restore the traditional collection structure
    # ----------------------------------------------------------------------

    final_deals = [
        record
        for record in combined
        if record.get("record_type") == "deal"
    ]

    final_orders = [
        record
        for record in combined
        if record.get("record_type") == "order"
    ]

    # ----------------------------------------------------------------------
    # Diagnostics
    # ----------------------------------------------------------------------

    if deals_error:

        logger.warning(
            (
                "History deals query failed but orders "
                "were retained: %s"
            ),
            deals_error,
        )

    if orders_error:

        logger.warning(
            (
                "History orders query failed but deals "
                "were retained: %s"
            ),
            orders_error,
        )

    logger.info(
        (
            "History retrieved deals=%s orders=%s "
            "combined=%s requestedLimit=%s"
        ),
        len(final_deals),
        len(final_orders),
        len(combined),
        total_limit,
    )

    # ----------------------------------------------------------------------
    # Empty history is a valid result.
    # ----------------------------------------------------------------------

    return {
        "deals": final_deals,
        "orders": final_orders,
    }


# ============================================================================
# Optional module metadata
# ============================================================================

__all__ = [
    "get_history",
]
