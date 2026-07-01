/*
==========================================================
WealthBuilder OS
Guardian Service
Capital Protection Layer
==========================================================
*/

class GuardianService {

    evaluate(account = {}, automation = {}) {

        const report = {

            status: "APPROVED",

            warnings: [],

            checks: {

                accountConnected: true,

                automationEnabled:
                    automation.enabled ?? false,

                marginLevel:
                    account.marginLevel ?? 0,

                equity:
                    account.equity ?? 0

            }

        };

        if (!automation.enabled) {

            report.status = "PAUSED";

            report.warnings.push(

                "Automation is disabled."

            );

        }

        if (

            account.marginLevel !== undefined &&

            account.marginLevel < 150

        ) {

            report.status = "STOPPED";

            report.warnings.push(

                "Margin level below safety threshold."

            );

        }

        return report;

    }

}

module.exports = new GuardianService();
