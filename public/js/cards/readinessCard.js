/*
==========================================================
WealthBuilder OS
Readiness Card
Powered by Jarvis Intelligence
==========================================================
*/

class ReadinessCard {

    constructor() {

        this.score =
            document.getElementById("readinessScore");

        this.status =
            document.getElementById("readinessStatus");

        this.wealthScore =
            document.getElementById("wealthScore");

    }

    showLoading() {

        if (this.score)
            this.score.textContent = "...";

        if (this.status)
            this.status.textContent =
                "Calculating readiness...";

    }

    showError(message) {

        if (this.status)
            this.status.textContent = message;

    }

    render(data) {

        if (!data) return;

        if (this.score)
            this.score.textContent =
                data.score ?? "--";

        if (this.wealthScore)
            this.wealthScore.textContent =
                data.score ?? "--";

        if (this.status)
            this.status.textContent =
                data.status ?? "Unknown";

    }

    async load() {

        this.showLoading();

        const response =
            await API.getReadiness();

        if (!response) {

            this.showError(
                "Unable to load readiness."
            );

            return;

        }

        const payload =
            response.data || response;

        this.render(payload);

    }

}

window.ReadinessCard =
    ReadinessCard;
