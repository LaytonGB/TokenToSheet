//constants
const TTS_state = 'TOKENTOSHEET';
const TTS_name = 'TTS';
function TTS_toChat (playerName) {return `/w ${playerName} `};
const TTS_error = TTS_name+' ERROR';
function TTS_error_toChat (playerName) {return `/w ${playerName} `};
const TTS_log = TTS_name+': ';

//options
const hpBar = 3;

on('ready', function(){
    log("Create Sheet from Token is Ready!");

    let players = findObjs({_type: 'player', _online: true});
    players.forEach(function(player){
        if (playerIsGM(player.id)){
            if(!findObjs({_type: 'macro', name: 'TokenToSheet'}, {caseInsensitive: true})[0]) {
                createObj('macro', {
                    _playerid: player.id,
                    name: 'TokenToSheet',
                    action: `!tokensheet`
                })
                ToChat('**TokenToSheet Macro Created.**')
            }
        }
    })

    on('chat:message', function(msg){
        if (msg.type == 'api'){
            if (msg.content.split(' ')[0] == '!tokensheet' && msg.selected && !msg.selected[1] && msg.selected[0]._type === 'graphic' && playerIsGM(msg.playerid)) {
                var playerName = msg.who.split(' ', 1);
                if (msg.content.split(' ').length == 1) {
                    MakeSheet(msg)
                } else if (msg.content.indexOf('--') == -1) {
                    let sheetName = msg.content.substring(msg.content.indexOf(' ')+1);
                    if (findObjs({_type: 'character', name: sheetName}) !== undefined) {
                        let sheet = findObjs({_type: 'character', name: sheetName})[0];
                        let obj = msg.selected[0];
                        let token = getObj(obj._type, obj._id);
                        if (token.get('represents')) {TokenMenu(token)}
                        ChatMenu(sheetName)
                    } else {
                        Error(`Could not find sheet named '${sheetName}'.`, 4)
                    }
                } else if (msg.selected[0] && (!isNaN(msg.content.split(' --')[1]) || msg.content.split(' --')[1] == 'roll hp')) {
                    let obj = msg.selected[0];
                    let token = getObj(obj._type, obj._id);
                    if (token.get('represents')){
                        TokenAdjust(msg, token);
                    } else {
                        Error(`Token must represent a sheet.`, 17)
                    }
                } else if (!isNaN(msg.content.split(' --')[1])) {
                    Error('A token must be selected.', 15)
                } else if (msg.content.indexOf('--') != -1) {
                    let sheetName = msg.content.substring(msg.content.indexOf(' ')+1, msg.content.indexOf('--')-1);
                    if (findObjs({_type: 'character', name: sheetName}) !== undefined) {
                        let sheet = findObjs({_type: 'character', name: sheetName})[0];
                        SheetAdjust(msg, sheet, sheetName)
                    } else {
                        Error(`Could not find sheet named '${sheetName}'.`, 6)
                    }
                } else {
                    Error(`Couldn't interpret command.`, 5)
                }
            } else if (playerIsGM(msg.playerid)) {
                Error(`Only GMs can use this API.`, 0)
            } else if (msg.selected === undefined) {
                Error(`A token must be selected.`, 1)
            } else if (msg.selected[1] !== undefined) {
                Error(`Only one token may be selected at a time.`, 2)
            }
        }

        function MakeSheet(msg){
            let token = getObj(msg.selected[0]._type, msg.selected[0]._id);

            if (!findObjs({_type: 'character', name: token.get('name')})[0]) {
                let img = token.get('imgsrc');
                img = img.replace("max.", "thumb.");
                img = img.replace("med.", "thumb.");
                img = img.replace("min.", "thumb.");

                let sheet;
                let sheetName;
                let represents = findObjs({_type: 'character', _id: token.get('represents')})[0] ? true : false;
                if (represents){
                    let oldSheet = getObj('character', token.get('represents'));
                    let controlledBy = oldSheet.get('controlledby') ? oldSheet.get('controlledby') : '';
                    sheet = createObj('character', {
                        name: token.get('name'),
                        avatar: img,
                        inplayerjournals: controlledBy,
                        controlledby: controlledBy
                    });
                    sheetName = sheet.get('name');
                    token.set('represents', sheet.id)

                    let attrArr = findObjs({_type: 'attribute', _characterid: oldSheet.id});
                    attrArr.forEach (function(attr){
                        setAttr(sheet, attr.get('name'), attr.get('current'), attr.get('max'))
                    })

                    for (let bar = 1; bar <= 3; bar++){
                        let attrID = token.get(`bar${bar}_link`);
                        if (attrID){
                            let attr = getObj('attribute', attrID);
                            let attrName = attr.get('name');
                            let newAttr = findObjs({_type: 'attribute', _characterid: sheet.id, name: attrName})[0] ? findObjs({_type: 'attribute', _characterid: sheet.id, name: attrName})[0] : false;
                            if (!newAttr){
                                newAttr = createObj('attribute', {
                                    _characterid: sheet.id,
                                    name: attrName,
                                    current: token.get(`bar${bar}_value`) ? token.get(`bar${bar}_value`) : "",
                                    max: token.get(`bar${bar}_max`) ? token.get(`bar${bar}_max`) : ""
                                })
                            }
                            token.set(`bar${bar}_link`, newAttr.id)
                        }
                    }

                } else {
                    let controlledBy = token.get('controlledby') ? token.get('controlledby') : '';
                    sheet = createObj('character', {
                        name: token.get('name'),
                        avatar: img,
                        inplayerjournals: controlledBy,
                        controlledby: controlledBy
                    });
                    sheetName = sheet.get('name');
                    token.set('represents', sheet.id)
                    
                    setAttr(sheet, 'npc', '1');
                }

                setDefaultTokenForCharacter( sheet, token )

                setAttr(sheet, 'npc_name', sheetName);
                setAttr(sheet, 'npc_options-flag', '0');

                createObj('ability', {
                    _characterid: sheet.id,
                    name: `~SheetMenu`,
                    action: `!tokensheet ${sheetName}`,
                    istokenaction: true
                })

                ToPlayer(`**Character '${sheetName}' created.**`)

                TokenMenu(token)

                setTimeout(function(){
                    ChatMenu(sheetName)
                }, 100);
            } else {
                Error(`Sheet '${token.get('name')}' already exists. To create a duplicate sheet, change the token's name.`, 3)
                let sheetName = token.get('represents') ? getObj('character', token.get('represents')) : "";
                if (sheetName) { TokenMenu(token); ChatMenu(); }
                return;
            }
        }

        function TokenMenu(token){
            let tokenName = token.get('name') ? token.get('name') : "Nameless Token";
        
            ToPlayer(`&{template:default} {{name=**${tokenName} Token Menu**}}`+
                `{{[Link Bar1](!tokensheet ${tokenName} --1 --?{Choose Attribute|AC|Temp Hit Points|Passive Perception|Speed})=Bar1 Currently: **${getObj('attribute', token.get('bar1_link')) ? getObj('attribute', token.get('bar1_link')).get('name') : "Unlinked"}**}}`+
                `{{[Link Bar2](!tokensheet ${tokenName} --2 --?{Choose Attribute|AC|Temp Hit Points|Passive Perception|Speed})=Bar2 Currently: **${getObj('attribute', token.get('bar2_link')) ? getObj('attribute', token.get('bar2_link')).get('name') : "Unlinked"}**}}`+
                `{{[Link Bar3](!tokensheet ${tokenName} --3 --?{Choose Attribute|AC|Temp Hit Points|Passive Perception|Speed})=Bar3 Currently: **${getObj('attribute', token.get('bar3_link')) ? getObj('attribute', token.get('bar3_link')).get('name') : "Unlinked"}**}}`+
                `{{[Roll HP Formula](!tokensheet ${tokenName} --roll hp)=}}`
            )
        }

        function ChatMenu(sheetName) {
            ToPlayer(`&{template:default} {{name=**${sheetName} Sheet Menu**}}`+
                `{{[Set CR](!tokensheet ${sheetName} --cr --?{Challenge Rating|1})=[Set AC](!tokensheet ${sheetName} --ac --?{AC|10})}}`+
                `{{[Set Ability Scores](!tokensheet ${sheetName} --ability scores --?{STR|10} ?{DEX|10} ?{CON|10} ?{INT|10} ?{WIS|10} ?{CHA|10})=[Set HP Formula](!tokensheet ${sheetName} --hp formula --?{HP Formula as XdY+Z|1d8+2})}}`+
                `{{[Add Save Proficiency](!tokensheet ${sheetName} --add save --?{Attribute|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma})=[Add Skill](!tokensheet ${sheetName} --add skill --?{Skill to Add|Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Sleight of Hand|Stealth|Survival})}}`+
                `{{[Set Size & Type](!tokensheet ${sheetName} --type --?{Size|Medium|Tiny|Small|Large|Huge|Gargantuan} ?{Type|abberation|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|humanoid &#40;dwarf&#41;|humanoid &#40;elf&#41;|humanoid &#40;gnome&#41;|humanoid &#40;human&#41;|monstrosity|ooze|plant|swarm of tiny beasts|undead|other})=[Set Speed](!tokensheet ${sheetName} --speed --?{Speed|30 ft., Climb 20 ft., Fly 20 ft.})}}`+
                `{{[Add Resistance](!tokensheet ${sheetName} --add resistance --?{Damage Type|Non-magical Weapons|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder})=[Add Immunity](!tokensheet ${sheetName} --add immunity --?{Damage Type|Non-mˀagical Weapons|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder})}}`
            )
        }

        function SheetAdjust(msg, sheet, sheetName) {
            let token = findObjs({_type: 'graphic', _subtype: 'token', represents: sheet.id})[0];

            let command = msg.content.substring(msg.content.indexOf('--')+2, (msg.content.indexOf('--', msg.content.indexOf('--')+2)-1));
            let value = msg.content.substring((msg.content.indexOf('--', msg.content.indexOf('--')+2)+2));
            let notNumber = false;
            function isNumber(score){
                if (isNaN(score)){notNumber = true}
            }

            let cr = parseInt(sheet.get('npc_challenge')) ? parseInt(sheet.get('npc_challenge')) : 1;
            switch (command) {
                case 'ability scores':
                    let scores = value.split(' ');
                    scores.forEach(isNumber);
                    if (scores.length == 6 && !notNumber) {
                        setAttr(sheet, 'strength', scores[0]);
                        setAttr(sheet, 'dexterity', scores[1]);
                        setAttr(sheet, 'constitution', scores[2]);
                        setAttr(sheet, 'intelligence', scores[3]);
                        setAttr(sheet, 'wisdom', scores[4]);
                        setAttr(sheet, 'charisma', scores[5]);

                        setAttr(sheet, 'strength'+'_mod', Math.floor((scores[0]-10)/2));
                        setAttr(sheet, 'dexterity'+'_mod', Math.floor((scores[1]-10)/2));
                        setAttr(sheet, 'constitution'+'_mod', Math.floor((scores[2]-10)/2));
                        setAttr(sheet, 'intelligence'+'_mod', Math.floor((scores[3]-10)/2));
                        setAttr(sheet, 'wisdom'+'_mod', Math.floor((scores[4]-10)/2));
                        setAttr(sheet, 'charisma'+'_mod', Math.floor((scores[5]-10)/2));

                        ToPlayer(`**Ability Scores Set for ${sheetName}.**`)
                        break;
                    } else {
                        Error(`Input for ability scores not correct. There must be 6 integers, but you entered '${value}'.`, 8)
                        break;
                    }
                case 'ac':
                    isNumber(value)
                    if (!notNumber && value.split(' ').length == 1) {
                        setAttr(sheet, 'npc_ac', value)
                        ToPlayer(`**AC Set for ${sheetName}.**`)
                        break;
                    } else {
                        Error(`Input for AC not correct. There must be 1 integer, but you entered '${value}'.`, 9)
                        break;
                    }
                case 'add save':
                    switch (value) {
                        case 'Strength':
                        case 'Dexterity':
                        case 'Constitution':
                        case 'Intelligence':
                        case 'Wisdom':
                        case 'Charisma':
                            setSave(value)
                            break;
                        default:
                            Error(`Input for Saving Throw not correct. Input must be an ability score, but you entered '${value}'.`, 11)
                            break;
                    }
                    break;
                    function setSave(value){
                        let valAbbr = value.substring(0,3).toLowerCase();

                        setAttr(sheet, `npc_saving_flag`, 2)
                        setAttr(sheet, `npc_${valAbbr}_save_flag`, 2)
                        setAttr(sheet, `npc_${valAbbr}_save`, profCalc(value.toLowerCase()))
                        setAttr(sheet, `npc_${valAbbr}_save_base`, profCalc(value.toLowerCase()))
                    }
                case 'hp formula':
                    setAttr(sheet, 'npc_hpformula', value)
                    ToPlayer(`**HP Formula Set for ${sheetName}.**`)
                    break;
                case 'speed':
                    setAttr(sheet, 'npc_speed', value)
                    ToPlayer(`**Speed Set for ${sheetName}.**`)
                    break;
                case 'type':
                    let size = value.substring(0, value.indexOf(' '));
                    let type = value.substring(value.indexOf(' ')+1);

                    setAttr(sheet, 'npc_type', size+' '+type)
                    ToPlayer(`**Size & Type Set for ${sheetName}.**`)
                    break;
                case 'cr':
                    isNumber(value)
                    if (!notNumber && value > 0) {
                        setAttr(sheet, 'npc_challenge', value)
                        ToPlayer(`**Challenge Rating Set for ${sheetName}.**`)
                        break;
                    } else {
                        Error(`Input for CR not correct. There must be 1 integer that has a value above 0, but you entered '${value}'.`, 10)
                        break;
                    }
                case 'add resistance':
                    addAttr(sheet, 'npc_resistances', value)
                    ToPlayer(`**Resistance Added for ${sheetName}.**`)
                    break;
                case 'add immunity':
                    addAttr(sheet, 'npc_immunities', value)
                    ToPlayer(`**Immunity Added for ${sheetName}.**`)
                    break;
                case 'add skill':
                    switch (value) {
                        case 'Athletics':
                            setSkill(value, 'strength')
                            ToPlayer(`**${value} added for ${sheetName}.**`)
                            break;
                        case 'Acrobatics':
                        case 'Sleight of Hand':
                        case 'Stealth':
                            setSkill(value, 'dexterity')
                            ToPlayer(`**${value} added for ${sheetName}.**`)
                            break;
                        case 'Arcana':
                        case 'History':
                        case 'Investigation':
                        case 'Nature':
                        case 'Religion':
                            setSkill(value, 'intelligence')
                            ToPlayer(`**${value} added for ${sheetName}.**`)
                            break;
                        case 'Animal Handling':
                        case 'Insight':
                        case 'Medicine':
                        case 'Perception':
                        case 'Survival':
                            setSkill(value, 'wisdom')
                            ToPlayer(`**${value} added for ${sheetName}.**`)
                            break;
                        case 'Deception':
                        case 'Intimidation':
                        case 'Performance':
                        case 'Persuasion':
                            setSkill(value, 'charisma')
                            ToPlayer(`**${value} added for ${sheetName}.**`)
                            break;
                        default:
                            Error(`Input for Skill not correct. Input must be a skill, but you entered '${value}'.`, 13)
                            break;
                    }
                    break;
                    function setSkill(value, attr){
                        setAttr(sheet, `npc_${value.replace(' ', '_').toLowerCase()}_flag`, 2)
                        setAttr(sheet, `npc_${value.replace(' ', '_').toLowerCase()}`, profCalc(attr))
                    }
                default:
                    Error(`Command not understood: '${msg.content}'.`, 7)
                    break;

                function profCalc(attr){
                    let attrMod = parseInt(getAttrByName(sheet.id, attr+'_mod')) ? parseInt(getAttrByName(sheet.id, attr+'_mod')) : 0;
                    if (isNaN(getAttrByName(sheet.id, attr+'_mod'))) {Error(`No ${attr} modifier found. Using '0' instead.`, 12)}
                    return attrMod+Math.floor(cr/4)+2;
                }
            }
        }

        function TokenAdjust(msg, token){
            let sheet = getObj('character', token.get('represents'));
            let sheetName = sheet.get('name');

            if (!sheet) {Error(`Token must represent a sheet.`); return;}

            let command = msg.content.match(/\-\-/g).length > 1 ? msg.content.substring(msg.content.indexOf('--')+2, (msg.content.indexOf('--', msg.content.indexOf('--')+2)-1)) : msg.content.substring(msg.content.indexOf('--')+2);
            let value = msg.content.match(/\-\-/g).length > 1 ? msg.content.substring((msg.content.indexOf('--', msg.content.indexOf('--')+2)+2)) : '';

            switch (command){
                case '1':
                case '2':
                case '3': 
                    let bar = command;
                    switch (value){
                        case 'Hit Points':
                            LinkBar(bar, 'hp')
                            break;
                        case 'AC':
                            LinkBar(bar, 'npc_ac')
                            break;
                        case 'Temp Hit Points':
                            LinkBar(bar, 'hp_temp')
                            break;
                        case 'Passive Perception':
                            LinkBar(bar, 'passive_wisdom')
                            break;
                        case 'Speed':
                            LinkBar(bar, 'npc_speed')
                            break;
                        default:
                            Error(`Inputs must be from the set macro inputs. You entered ${value}.`, 14)
                            break;

                        function LinkBar(bar, attr){
                            let attrs = findObjs({
                                _type: 'attribute',
                                _characterid: sheet.id,
                                name: attr
                            })

                            if (attrs.length == 1){
                                token.set(`bar${bar}_link`, attrs[0].id)
                            } else if (attrs.length < 1) {
                                let newAttr = createObj('attribute', {
                                    _characterid: sheet.id,
                                    name: attr,
                                    current: '0'
                                })
                                token.set(`bar${bar}_link`, newAttr.id)
                                ToPlayer(`**Attribute '${attr}' was not found, so it was created and set to 0.**`)
                            } else {
                                Error(`Found multiple attributes named ${attr}.`, 18)
                                return;
                            }
                            setDefaultTokenForCharacter( sheet, token )
                            return;
                        }
                    }
                    break;
                case 'roll hp':
                    let formula = getAttrByName(sheet.id, 'npc_hpformula');
                    if (formula){
                        let newHP = Roll(formula);
                        token.set(`bar${hpBar}_value`, newHP)
                        token.set(`bar${hpBar}_max`, newHP)
                        return;
                    } else {
                        Error(`No HP formula attribute found.`, 21)
                        return;
                    }
                    function Roll(formula){
                        let x = formula.substring(0, formula.indexOf('d'));
                        let y = formula.search(/[+-]/) != -1 ? formula.substring(formula.indexOf('d')+1, formula.search(/[+-]/)) : formula.substring(formula.indexOf('d')+1);
                        let z = formula.search(/[+-]/) != -1 ? formula.substring(formula.search(/[+-]/)) : '';
                        let result = 0;

                        if (isNaN(x)){
                            Error(`Expected number, recieved '${x}' from input '${formula}'.`, 22);
                            return;
                        } else if (isNaN(y)){
                            Error(`Expected number, recieved '${y}' from input '${formula}'.`, 23);
                            return;
                        } else if (isNaN(z)){
                            for (let i = 0; i < x; i++){
                                result += +randomInteger(y);
                            }
                        } else {
                            for (let i = 0; i < x; i++){
                                result += +randomInteger(y);
                            }
                            result += +z;
                        }
                        ToPlayer(`**Token Bar ${hpBar} set to ${result}/${result} (${x} d ${y} ${z}).**`)
                        return result;
                    }
                default: 
                    Error(`Unknown Error.`, 16)
                    return;
            }
        }

        function setAttr(sheet, name, value, max){
            let attributes = findObjs({_type: 'attribute', _characterid: sheet.id, name: name});
            if (!attributes || !attributes[0]) {
                createObj('attribute', {
                    _characterid: sheet.id,
                    name: name,
                    current: value,
                    max: max ? max : ''
                })
            } else {
                attributes[0].set('current', value)
                attributes[0].set('max', max ? max : '')
            }
        }

        function addAttr(sheet, name, value){
            let attributes = findObjs({_type: 'attribute', _characterid: sheet.id, name: name});
            if (!attributes || !attributes[0]) {
                createObj('attribute', {
                    _characterid: sheet.id,
                    name: name,
                    current: value
                })
            } else {
                attributes[0].set('current', attributes[0].get('current')+', '+value)
            }
        }

        function ToPlayer(message){
            sendChat(TTS_name, TTS_toChat(playerName)+message);
        }

        function Error(error, code){
            sendChat(TTS_error, TTS_error_toChat(playerName)+'**'+error+'**'+EC(code));
            log(TTS_log+error+EC(code));
        }

        function EC(error){
            return ' Error code '+error+'.';
        }
    })

    function ToChat(message){
        sendChat(TTS_name, message)
    }
})