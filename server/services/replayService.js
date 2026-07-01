/*
==========================================================
WealthBuilder OS
Replay Service
Powered by Jarvis Intelligence
==========================================================
*/

class ReplayService {

    constructor() {

        this.replays = [];

    }

    add(report) {

        this.replays.unshift({

            id: Date.now(),

            created: new Date(),

            report

        });

    }

    getAll() {

        return this.replays;

    }

    get(id) {

        return this.replays.find(

            replay => replay.id == id

        );

    }

}

module.exports =
    new ReplayService();
