import Card from './Card.js';
import Game from './Game.js';
import SpeedRate from './SpeedRate.js';


function isDuck(card) {
    return card && card.quacks && card.swims;
}

function isDog(card) {
    return card instanceof Dog;
}

function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) return 'Утка-Собака';
    if (isDuck(card)) return 'Утка';
    if (isDog(card)) return 'Собака';
    return 'Существо';
}


class Creature extends Card {
    getDescriptions() {
        return [
            getCreatureDescription(this),
            ...super.getDescriptions()
        ];
    }
}


class Duck extends Creature {
    constructor() {
        super('Мирная утка', 2);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float');
    }
}


class Dog extends Creature {
    constructor() {
        super('Пес-бандит', 3);
    }
}


class Trasher extends Dog {
    constructor() {
        super();
        this.name = 'Громила';
        this.maxPower = 5;
        this.currentPower = 5;
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            continuation(value - 1);
        });
    }

    getDescriptions() {
        return [
            'Получает на 1 меньше урона',
            ...super.getDescriptions()
        ];
    }
}


class Gatling extends Creature {
    constructor() {
        super('Гатлинг', 6);
    }

    attack(gameContext, continuation) {
        const { oppositePlayer } = gameContext;
        const cards = oppositePlayer.table;

        const attackNext = (i) => {
            if (i >= cards.length) {
                continuation();
                return;
            }

            const card = cards[i];

            if (!card) {
                attackNext(i + 1);
                return;
            }

            this.view.showAttack(() => {
                this.dealDamageToCreature(2, card, gameContext, () => {
                    attackNext(i + 1);
                });
            });
        };

        attackNext(0);
    }
}


class Lad extends Dog {
    constructor() {
        super();
        this.name = 'Браток';
        this.maxPower = 2;
        this.currentPower = 2;
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getBonus() {
        const n = this.getInGameCount();
        return (n * (n + 1)) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        continuation();
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        continuation(value - Lad.getBonus());
    }

    getDescriptions() {
        const descriptions = [
            ...super.getDescriptions()
        ];

        if (
            Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')
        ) {
            descriptions.unshift('Чем их больше, тем они сильнее');
        }

        return descriptions;
    }
}


const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Dog(),
    new Gatling(),
    new Duck(),
];

const banditStartDeck = [
    new Dog(),
    new Trasher(),
    new Lad(),
    new Lad(),
    new Dog(),
];


const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});