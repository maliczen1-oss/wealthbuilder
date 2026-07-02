/*
==========================================================
 WealthBuilder OS
 API Layer
 Powered by Jarvis Intelligence
==========================================================
*/

const API = {

    async request(endpoint, options = {}) {

        try {

            const response = await fetch(endpoint, {
                headers: {
                    "Content-Type": "application/json"
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(
                    `API Error ${response.status}`
                );
            }

            return await response.json();

        } catch (error) {

            console.error(
                `[API] ${endpoint}`,
                error
            );

            return null;

        }

    },

    async getHealth() {

        return this.request("/api/health");

    },

    async getAccount() {

        return this.request("/api/account");

    },

    async getPositions() {

        return this.request("/api/positions");

    },

    async getMorningBrief() {

        return this.request("/api/morning-brief");

    },

    async getReadiness() {

        return this.request("/api/readiness");

    },
 async getGuardian() {

    return this.request("/api/guardian");

},

    async getDNA() {

        return this.request("/api/dna");

    },

    async getPsychology() {

        return this.request("/api/psychology");

    },

    async getAutomation() {

        return this.request("/api/automation");

    },
async getSystemInfo() {

    return this.request("/api/system-info");

}

async getNotifications() {

    return this.request("/api/notifications");

}

async getReplay() {

    return this.request("/api/replay");

} 

    async updateAutomation(settings) {

        return this.request(
            "/api/automation/settings",
            {
                method: "POST",
                body: JSON.stringify(settings)
            }
        );

    }

};

window.API = API;
