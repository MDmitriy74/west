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
    constructor(name, maxPower) {
        super(name, maxPower);
        delete this.currentPower;
        this._currentPower = maxPower;
    }

    get currentPower() {
        return this._currentPower;
    }

    set currentPower(value) {
        this._currentPower = Math.min(value, this.maxPower);
    }

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
    constructor(name, maxPower) {
        super();
        this.name = name || 'Браток';
        this.maxPower = maxPower || 2;
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

class Rogue extends Creature {
    constructor() {
        super('Изгой', 2);
    }

    attack(gameContext, continuation) {
        const { oppositePlayer } = gameContext;
        const target = oppositePlayer.table[0];

        if (target) {
            this.stealAbilities(target, gameContext);
        }

        super.attack(gameContext, continuation);
    }

    stealAbilities(target, gameContext) {
        const abilityNames = [
            'modifyDealedDamageToCreature',
            'modifyDealedDamageToPlayer',
            'modifyTakenDamage'
        ];

        const proto = Object.getPrototypeOf(target);

        abilityNames.forEach((name) => {
            if (proto.hasOwnProperty(name)) {
                if (!this.hasOwnProperty(name)) {
                    this[name] = proto[name];
                }
                delete proto[name];
            }
        });

        gameContext.updateView();
    }

    getDescriptions() {
        return [
            'Перед атакой крадёт боевые способности у карт того же типа',
            ...super.getDescriptions()
        ];
    }
}

class PseudoDuck extends Dog {
    constructor() {
        super();
        this.name = 'Псевдоутка';
        this.maxPower = 3;
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float');
    }
}

class Nemo extends Creature{
    constructor() {
        super('Немо', 4);
    }

    doBeforeAttack(gameContext, continuation) {
        const { oppositePlayer, position, updateView } = gameContext;
        const targetCard = oppositePlayer.table[position];

        if (targetCard) {
            const targetProto = Object.getPrototypeOf(targetCard);
            Object.setPrototypeOf(this, targetProto);
            updateView();
            this.doBeforeAttack(gameContext, continuation);
        } else {
            continuation();
        }
    }
}

class Brewer extends Duck {
    constructor() {
        super();
        this.name = 'Пивовар';
    }

    attack(gameContext, continuation) {
        const { currentPlayer, oppositePlayer } = gameContext;
        const allCards = currentPlayer.table.concat(oppositePlayer.table);
        const ducks = allCards.filter(isDuck);

        ducks.forEach(card => {
            card.maxPower += 1;
            card.currentPower += 2;
            this.view.signalHeal(card);
            card.updateView();
        });

        super.attack(gameContext, continuation);
    }
}

const seriffStartDeck = [
    new Nemo(),
];
const banditStartDeck = [
    new Brewer(),
    new Brewer(),
];


const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});