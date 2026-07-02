/*
==========================================================
WealthBuilder OS
Mission Control
Application Controller
Powered by Jarvis Intelligence
==========================================================
*/

class MissionControl {

    constructor() {

        this.cards = [];

    }

    async initialize() {

        console.log(
            "Starting WealthBuilder OS..."
        );

        await this.checkConnection();

        this.createCards();

        await this.loadCards();

        this.startRefreshLoop();

        console.log(
            "Mission Control Ready."
        );

    }

    async checkConnection() {

        const health =
            await API.getHealth();

        if (!health) {

            console.error(
                "Unable to reach backend."
            );

        }

    }

createCards() {

    this.cards = [

        new MorningBriefCard(),

        new ReadinessCard(),

        new AccountCard(),

        new GuardianCard(),

        new AutomationCard(),

        new PlatformCard(),

        new NotificationCard(),

        new TradeStoryCard(),

    

    ];

}

    async loadCards() {

        for (const card of this.cards) {

            if (typeof card.load === "function") {

                try {

                    await card.load();

                }

                catch (err) {

                    console.error(err);

                }

            }

        }

    }

    startRefreshLoop() {

        setInterval(async () => {

            await this.loadCards();

        }, 30000);

    }

}

window.addEventListener(

    "DOMContentLoaded",

    async () => {

        const missionControl =
            new MissionControl();

        await missionControl.initialize();

    }

);
