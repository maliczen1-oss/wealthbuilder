const coachEngine = require("./coachEngine");
const accountService = require("./accountService");

async function generate() {

    const account =
        await accountService.getAccount();

    const coach =
        coachEngine.generateMorningBrief();

    return {

        greeting:
            coach.greeting,

        account: {

            balance:
                account.balance,

            equity:
                account.equity,

            freeMargin:
                account.freeMargin,

            leverage:
                account.leverage,

            currency:
                account.currency

        },

        coach

    };

}

module.exports = {

    generate

};
