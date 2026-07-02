/*
==========================================================
WealthBuilder OS
Account Card
Powered by Jarvis Intelligence
==========================================================
*/

class AccountCard {

    constructor() {

        this.container =
            document.getElementById("accountHealth");

    }

    showLoading() {

        if (!this.container) return;

        this.container.innerHTML = `
            <p>Loading account information...</p>
        `;

    }

    showError(message) {

        if (!this.container) return;

        this.container.innerHTML = `
            <p>${message}</p>
        `;

    }

    render(account) {

        if (!this.container) return;

        this.container.innerHTML = `

            <div class="account-row">
                <strong>Balance</strong>
                <span>${account.balance ?? "--"}</span>
            </div>

            <div class="account-row">
                <strong>Equity</strong>
                <span>${account.equity ?? "--"}</span>
            </div>

            <div class="account-row">
                <strong>Free Margin</strong>
                <span>${account.freeMargin ?? "--"}</span>
            </div>

            <div class="account-row">
                <strong>Margin Level</strong>
                <span>${account.marginLevel ?? "--"}%</span>
            </div>

            <div class="account-row">
                <strong>Leverage</strong>
                <span>${account.leverage ?? "--"}</span>
            </div>

        `;

    }

    async load() {

        this.showLoading();

        const response =
            await API.getAccount();

        if (!response) {

            this.showError(
                "Unable to load account."
            );

            return;

        }

        const payload =
            response.data || response;

        this.render(payload);

    }

}

window.AccountCard = AccountCard;
