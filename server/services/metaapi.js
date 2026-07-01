const MetaApi = require("metaapi.cloud-sdk").default;

let api = null;
let account = null;
let connection = null;

async function initialize(token, accountId) {

    api = new MetaApi(token);

    account =
        await api.metatraderAccountApi.getAccount(
            accountId
        );

    if (account.state !== "DEPLOYED") {
        await account.deploy();
    }

    await account.waitConnected();

    connection =
        account.getRPCConnection();

    await connection.connect();

    await connection.waitSynchronized();

    console.log(
        "MetaApi synchronized successfully."
    );

}

function getConnection() {
    return connection;
}

function getAccount() {
    return account;
}

module.exports = {

    initialize,

    getConnection,

    getAccount

};
