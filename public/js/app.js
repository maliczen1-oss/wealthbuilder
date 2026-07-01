/*
==========================================================
WealthBuilder OS
Mission Control Controller
Powered by Jarvis Intelligence
==========================================================
*/

class MissionControl {

    constructor() {

        this.refreshInterval = 30000;

    }

    async initialize() {

        console.log("Mission Control Initializing...");

        await this.loadHealth();

        await this.loadMorningBrief();

        await this.loadReadiness();

        await this.loadAccount();

        await this.loadAutomation();

        await this.loadDNA();

        await this.loadPsychology();

        this.startClock();

        this.startAutoRefresh();

    }

    async loadHealth() {

        const health = await API.getHealth();

        if (!health) return;

        const broker =
            document.getElementById("brokerName");

        if (broker) {

            broker.textContent =
                health.broker || "Unknown Broker";

        }

    }

    async loadMorningBrief() {

        const brief =
            await API.getMorningBrief();

        const container =
            document.getElementById("morningBrief");

        if (!container) return;

        if (!brief) {

            container.innerHTML =
                "Unable to load Morning Brief.";

            return;

        }

        container.innerHTML = `
            <strong>${brief.title || "Today's Brief"}</strong>
            <br><br>
            ${brief.message || "Welcome back to WealthBuilder."}
        `;

    }

    async loadReadiness() {

        const readiness =
            await API.getReadiness();

        if (!readiness) return;

        document.getElementById(
            "readinessScore"
        ).textContent = readiness.score;

        document.getElementById(
            "readinessStatus"
        ).textContent = readiness.status;

        document.getElementById(
            "wealthScore"
        ).textContent = readiness.score;

    }

    async loadAccount() {

        const account =
            await API.getAccount();

        const panel =
            document.getElementById(
                "accountHealth"
            );

        if (!panel) return;

        if (!account) {

            panel.innerHTML =
                "Unable to load account.";

            return;

        }

        panel.innerHTML = `
            Balance:
            ${account.balance}<br>

            Equity:
            ${account.equity}<br>

            Margin:
            ${account.margin}<br>

            Free Margin:
            ${account.freeMargin}
        `;

    }

    async loadAutomation() {

        const automation =
            await API.getAutomation();

        const panel =
            document.getElementById(
                "automationStatus"
            );

        if (!panel) return;

        if (!automation) {

            panel.innerHTML =
                "Automation unavailable.";

            return;

        }

        panel.innerHTML = `
            Status:
            <strong>

            ${automation.enabled
                ? "Enabled"
                : "Disabled"}

            </strong>
        `;

    }

    async loadDNA() {

        const dna =
            await API.getDNA();

        console.log(
            "DNA",
            dna
        );

    }

    async loadPsychology() {

        const psychology =
            await API.getPsychology();

        console.log(
            "Psychology",
            psychology
        );

    }

    startClock() {

        const clock =
            document.getElementById(
                "serverTime"
            );

        if (!clock) return;

        setInterval(() => {

            clock.textContent =
                new Date()
                .toLocaleTimeString();

        }, 1000);

    }

    startAutoRefresh() {

        setInterval(() => {

            this.loadMorningBrief();

            this.loadReadiness();

            this.loadAccount();

            this.loadAutomation();

        }, this.refreshInterval);

    }

}

window.addEventListener(

    "DOMContentLoaded",

    () => {

        const app =
            new MissionControl();

        app.initialize();

    }

);
