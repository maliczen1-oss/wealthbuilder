/*
==========================================================
WealthBuilder OS
Morning Brief Card
Powered by Jarvis Intelligence
==========================================================
*/

class MorningBriefCard {

    constructor() {

        this.container =
            document.getElementById(
                "morningBrief"
            );

    }

    showLoading() {

        if (!this.container) return;

        this.container.innerHTML = `
            <p>Preparing your Morning Brief...</p>
        `;

    }

    showError(message) {

        if (!this.container) return;

        this.container.innerHTML = `
            <p>${message}</p>
        `;

    }

    render(data) {

        if (!this.container) return;

        this.container.innerHTML = `

            <strong>

                ${data.title || "Good Morning"}

            </strong>

            <br><br>

            <p>

                ${data.message ||
                "Welcome back to WealthBuilder."}

            </p>

        `;

    }

    async load() {

        this.showLoading();

        const brief =
            await API.getMorningBrief();

        if (!brief) {

            this.showError(

                "Unable to load Morning Brief."

            );

            return;

        }

        /*
        Supports both:
        api.success({...})
        and direct JSON responses.
        */

        const payload =
            brief.data || brief;

        this.render(payload);

    }

}

window.MorningBriefCard =
    MorningBriefCard;
