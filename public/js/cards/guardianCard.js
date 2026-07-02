/*
==========================================================
WealthBuilder OS
Guardian Card
Powered by Jarvis Intelligence
==========================================================
*/

class GuardianCard {

    constructor() {

        this.container =
            document.getElementById("guardianStatus");

    }

    showLoading() {

        if (!this.container) return;

        this.container.innerHTML = `
            <p>Guardian is evaluating risk...</p>
        `;

    }

    showError(message) {

        if (!this.container) return;

        this.container.innerHTML = `
            <p>${message}</p>
        `;

    }

    render(report) {

        if (!this.container) return;

        const warnings = report.warnings?.length
            ? report.warnings.map(w => `<li>${w}</li>`).join("")
            : "<li>No active warnings.</li>";

        this.container.innerHTML = `

            <div class="guardian-status">

                <div class="account-row">
                    <strong>Status</strong>
                    <span>${report.status}</span>
                </div>

                <div class="account-row">
                    <strong>Automation</strong>
                    <span>
                        ${report.checks.automationEnabled ? "Enabled" : "Disabled"}
                    </span>
                </div>

                <div class="account-row">
                    <strong>Margin Level</strong>
                    <span>${report.checks.marginLevel}%</span>
                </div>

                <strong>Warnings</strong>

                <ul>

                    ${warnings}

                </ul>

            </div>

        `;

    }

    async load() {

        this.showLoading();

        const response =
            await API.getGuardian();

        if (!response) {

            this.showError(
                "Unable to load Guardian."
            );

            return;

        }

        const payload =
            response.data || response;

        this.render(payload);

    }

}

window.GuardianCard = GuardianCard;
