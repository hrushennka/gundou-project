const express = require('express');
const hbs = require('express-handlebars');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MessageAttachment } = require('discord.js');

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

let logs =[]
class WebSocket {
    constructor(token, port, client) {
        this.token = token;
        this.client = client;
        this.app = express();
        this.app.engine('hbs', hbs.engine({
            extname: 'hbs',
            defaultLayout: 'layout',
            layoutsDir: path.join(__dirname, 'layouts'), 
            helpers: {
                json: function(context) {
                    return JSON.stringify(context, null, 2); 
                },
                neq: function(a, b) {
                    return a !== b;
                }
            }
        }));
        this.app.set('views', path.join(__dirname, 'views'));
        this.app.set('view engine', 'hbs');
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(bodyParser.urlencoded({ extended: true })); 
        this.app.use(bodyParser.json());

        this.registerRoots();

        this.server = this.app.listen(port, () => {
            console.log(`Websocket listening on port ${this.server.address().port}`);
        });

        this.client.on('guildMemberAdd', async member => {
            const channel = this.client.channels.cache.get('1005942559790608394');

            if (!channel) {
                console.error('Channel not found');
                return res.status(404).json({ error: 'Channel not found' });
            }

            if (channel) {
                await this.logPostRequest({ originalUrl: "/api/guildMemberAdd", body: { member: member.id } }, "Приветствие отправлено");
                const embeds = await this.loadEmbeds();
                if (embeds.length > 0) {
                    const randomEmbed = embeds[Math.floor(Math.random() * embeds.length)]; 
                    
                    await channel.send({ embeds: [randomEmbed] });
                } else {
                    channel.send(`Добро пожаловать на сервер, ${member}!`);
                }
            }
        });
    }

    checkToken(_token) {
        return (_token === this.token); 
    }

    async loadEmbeds() {
        const filePath = path.join(__dirname, 'embeds.json');
        try {
            const data = fs.readFileSync(filePath, 'utf8');

            if (!data) {
                return [];
            }

            return JSON.parse(data);
        } catch (err) {
            console.error('Ошибка чтения файла:', err);
            return []; 
        }
    }


        
    async logPostRequest(req, postType) {
        const now = new Date();
        const time = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
    
        const logData = {
            requestType: postType,
            endpoint: req.originalUrl,
            date: time,
            body: req.body 
        };
        
        const logFilePath = path.join(__dirname, 'logs.json');
    
        let totalOperations = 0; 
    
        if (fs.existsSync(logFilePath)) {
            const fileContent = fs.readFileSync(logFilePath, 'utf-8').trim();
    
            if (fileContent) {
                try {
                    const logs = JSON.parse(fileContent);
    
                    totalOperations = logs.totalOperations || 0; 
    
                    if (Array.isArray(logs.entries)) {
                        logs.entries.push(logData);
                        totalOperations++;
    
                        // Проверяем, если количество записей превышает 100
                        if (logs.entries.length > 100) {
                            logs.entries.shift();
                        }
    
                        // Обновляем общее количество операций
                        logs.totalOperations = totalOperations;
    
                        fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
                        return;
                    } else {
                        console.warn('Лог-файл не содержит массив. Инициализируем с пустым массивом.');
                    }
                } catch (parseError) {
                    console.error('Ошибка парсинга JSON:', parseError);
                }
            }
        } 
        // Если лог-файл не существует или пуст, создаем новый массив логов
        const initialLogs = {
            entries: [logData],
            totalOperations: 1 
        };
        fs.writeFileSync(logFilePath, JSON.stringify(initialLogs, null, 2));
    }
    
    async saveEmbeds(embeds) {
        const filePath = path.join(__dirname, 'embeds.json');
        fs.writeFileSync(filePath, JSON.stringify(embeds, null, 4));
    }
    
    async removeEmbed(embedId) {
        const filePath = path.join(__dirname, 'embeds.json');
        try {
            const data = fs.readFileSync(filePath, 'utf8');
    
            if (!data) {
                return false;
            }
            const embeds = JSON.parse(data);
            const initialLength = embeds.length;
    
            const updatedEmbeds = embeds.filter(embed => embed.id !== embedId);
    
            // Если длина массива изменилась, значит эмбед был удалён
            if (updatedEmbeds.length < initialLength) {
                fs.writeFileSync(filePath, JSON.stringify(updatedEmbeds, null, 2), 'utf8');
                return true; 
            } else {
                return false; 
            }
        } catch (err) {
            console.error('Ошибка при удалении эмбеда:', err);
            return false; 
        }
    }

    registerRoots() {
        
        this.app.get('/index', (req, res) => {
            
            const _token = req.query.token;

            if (!this.checkToken(_token)) {
                res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
                return;
            }

            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
            const channels = [];

            this.client.channels.cache.forEach(channel => {
                if (channel.type === 'GUILD_TEXT') {
                    channels.push({ id: channel.id, name: channel.name, position: channel.rawPosition });
                }
            });

            channels.sort((a, b) => a.position - b.position);

            res.render('index', {
                title: 'discordBot webinterface',
                style: '/css/index.css',
                token: _token,
                clientAvatar,
                channels
            });
        });

        this.app.get('/authorization', (req, res) => {
            const _token = req.query.token;
        
            if (!this.checkToken(_token)) {
                return res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
            }
        
            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
        
            res.render('authorization', {
                title: 'Authorization Page',
                style: '/css/authorization.css',
                token: _token,
                clientAvatar,
                layout: false 
            });
        });

        this.app.get('/main', (req, res) => {
            const _token = req.query.token;

            if (!this.checkToken(_token)) {
                return res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
            }

            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
            const channels = [];
            this.client.channels.cache.forEach(channel => {
                if (channel.type === 'GUILD_TEXT') {
                    channels.push({ id: channel.id, name: channel.name, position: channel.rawPosition });
                }
            });
            channels.sort((a, b) => a.position - b.position);
            res.render('main', {
                title: 'Main Page',
                style: '/css/main.css',
                token: _token,
                clientAvatar,
                channels
            });
        });

        this.app.get('/status_bar', (req, res) => {
            const _token = req.query.token;
            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
        
            if (!this.checkToken(_token)) {
                return res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
            }
        
            const logFilePath = path.join(__dirname, 'logs.json');
            let totalOperations = 0; 
            let logs = [];
            if (fs.existsSync(logFilePath)) {
                const fileContent = fs.readFileSync(logFilePath, 'utf-8').trim();
                if (fileContent) {
                    try {
                        const parsedLogs = JSON.parse(fileContent); 
                        
                        // Проверяем структуру и извлекаем только записи
                        if (parsedLogs && Array.isArray(parsedLogs.entries)) {
                            logs = parsedLogs.entries; 
                            totalOperations = parsedLogs.totalOperations || 0;
                        } else {
                            console.warn('Логи не имеют ожидаемой структуры.');
                        }
                    } catch (parseError) {
                        console.error('Ошибка парсинга логов:', parseError);
                    }
                }
            }
        
            const operationsData = logs.map(log => {
                const date = new Date(log.date);
                return {
                    requestType: log.requestType,
                    date: date.toLocaleDateString('ru-RU'),
                    time: date.toLocaleTimeString('ru-RU') 
                };
            });
        
    
            res.render('status_bar', {
                title: 'Status Bar',
                style: '/css/status_bar.css',
                token: _token,
                clientAvatar,
                totalOperations,
                operationsData 
            });
        });    

        this.app.get('/invite_bot', async (req, res) => {
            const _token = req.query.token;
            
            if (!this.checkToken(_token)) {
                return res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
            }
        
            const guildId = '898893129476866089'; 
            const guild = this.client.guilds.cache.get(guildId);
            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
            
            let guildAvatarUrl = null;
            let guildName = null; 

            if (guild) {
                guildAvatarUrl = guild.iconURL({ format: 'png', dynamic: true, size: 1024 });
                guildName = guild.name;

                const textChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT');
                const voiceChannels = guild.channels.cache
                .filter(channel => channel.type === 'GUILD_VOICE') 
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    position: channel.rawPosition,
                })); 
                const memberCount = guild.memberCount;

                const botMembers = guild.members.cache.filter(member => member.user.bot).map(member => ({
                    id: member.id,
                    username: member.user.username,
                    discriminator: member.user.discriminator,
                    avatarURL: member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }), // URL аватара бота
                }));
                
                res.render('invite_bot', {
                    title: 'Invite Bot',
                    style: '/css/invite_bot.css',
                    token: _token,
                    clientAvatar,
                    guildName,
                    bots: botMembers,
                    guildAvatarUrl, 
                    voiceChannels,
                    textChannelCount: textChannels.size,
                    voiceChannelCount: voiceChannels.size,
                    memberCount 
                }); 
            } else {
                res.render('error', { title: 'ERROR', errtype: "GUILD NOT FOUND" });
            }
        });

        this.app.get('/send_msg', async (req, res) => {
            const _token = req.query.token;
        
            if (!this.checkToken(_token)) {
                return res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
            }
        
            const guildId = '898893129476866089'; 
            const guild = this.client.guilds.cache.get(guildId);
            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
            
            let guildAvatarUrl = null;
            let guildName = null; 

            if (guild) {
                guildAvatarUrl = guild.iconURL({ format: 'png', dynamic: true, size: 1024 });
                guildName = guild.name;
                const textChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT');
                const voiceChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_VOICE');
                const memberCount = guild.memberCount;
        
                res.render('send_msg', {
                    title: 'Send Message',
                    style: '/css/send_msg.css',
                    token: _token,
                    clientAvatar,
                    guildName,
                    guildAvatarUrl, 
                    channels: textChannels.concat(voiceChannels).map(channel => ({
                        id: channel.id,
                        name: channel.name,
                        type: channel.type,
                        position: channel.rawPosition,
                    })),
                    textChannelCount: textChannels.size,
                    voiceChannelCount: voiceChannels.size,
                    memberCount 
                });
            } else {
                res.render('error', { title: 'ERROR', errtype: "GUILD NOT FOUND" });
            }
        });

        this.app.get('/hello_msg', async (req, res) => {
            const _token = req.query.token;
        
            if (!this.checkToken(_token)) {
                return res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
            }
        
            const guildId = '898893129476866089'; 
            const guild = this.client.guilds.cache.get(guildId);
            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
            
            let guildAvatarUrl = null;
            let guildName = null; 

            if (guild) {
                guildAvatarUrl = guild.iconURL({ format: 'png', dynamic: true, size: 1024 });
                guildName = guild.name;
                const textChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT');
                const voiceChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_VOICE');
                const memberCount = guild.memberCount;
                
                const embeds = await this.loadEmbeds();

                res.render('hello_msg', {
                    title: 'Edit Hello Message',
                    style: '/css/hello_msg.css',
                    token: _token,
                    clientAvatar,
                    guildName,
                    guildAvatarUrl, 
                    embeds,
                    textChannelCount: textChannels.size,
                    voiceChannelCount: voiceChannels.size,
                    memberCount 
                });
            } else {
                res.render('error', { title: 'ERROR', errtype: "GUILD NOT FOUND" });
            }
        });

        const { joinVoiceChannel } = require('@discordjs/voice');

        this.app.post('/invite', upload.none(), async (req, res) => {
            const { token, voiceChannelId, botId } = req.body;

            if (!this.checkToken(token)) {
                return res.status(400).json({ success: false, message: "INVALID TOKEN" });
            }

            const guildId = '898893129476866089';
            const guild = this.client.guilds.cache.get(guildId);

            const channel = guild.channels.cache.get(voiceChannelId);
            if (!channel || channel.type !== 'GUILD_VOICE') {
                return res.status(404).json({ success: false, message: 'Канал не найден или не является голосовым.' });
            }

            const botMember = await guild.members.fetch(botId).catch(() => null);
            if (!botMember) {
                return res.status(404).json({ success: false, message: 'Бот не найден.' });
            }

            try {
                joinVoiceChannel({
                    channelId: voiceChannelId,
                    guildId: guildId,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true, 
                    selfMute: false,  
                });

                return res.status(200).json({ success: true, message: 'Бот успешно присоединился к каналу.' });

            } catch (error) {
                return res.status(500).json({ success: false, message: 'Не удалось присоединить бота к каналу.', error: error.message });
            }
        });
        
        this.app.get('/api/getEmbeds', async (req, res) => {
            const _token = req.query.token;
        
            if (!this.checkToken(_token)) {
                return res.status(401).json({ error: "INVALID TOKEN" });
            }
            res.clearCookie('yourCookieName');
            const embeds = await this.loadEmbeds(); 
        
            res.json(embeds); 
        });

        this.app.get('/edit_mbs', async (req, res) => {
            const _token = req.query.token;
        
            if (!this.checkToken(_token)) {
                return res.render('error', { title: 'ERROR', errtype: "INVALID TOKEN" });
            }
        
            const guildId = '898893129476866089';
            const guild = this.client.guilds.cache.get(guildId);
            const clientAvatar = this.client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
        
            let guildAvatarUrl = null;
            let guildName = null;
        
            if (guild) {
                guildAvatarUrl = guild.iconURL({ format: 'png', dynamic: true, size: 1024 });
                guildName = guild.name;
                const textChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT');
                const voiceChannels = guild.channels.cache.filter(channel => channel.type === 'GUILD_VOICE');
                const memberCount = guild.memberCount;
                const members = await guild.members.fetch();
                const memberList = members.map(member => ({
                    id: member.id,
                    username: member.user.username,
                    avatarURL: member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 128 }),
                    roles: JSON.stringify(member.roles.cache.map(role => ({
                        name: role.name,
                        hexColor: role.hexColor,
                        id: role.id
                    })))
                }));

                // Получаем список забаненных участников
                const bannedMembers = await guild.bans.fetch();
                const bannedMemberList = bannedMembers.map(banInfo => ({
                    id: banInfo.user.id,
                    username: banInfo.user.username,
                    avatarURL: banInfo.user.displayAvatarURL({ format: 'png', dynamic: true, size: 128 }),
                    banned: true 
                }));
        
                const allRoles = guild.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    hexColor: role.hexColor
                }));
        
                res.render('edit_members', {
                    title: 'Editing Members',
                    style: '/css/edit_members.css',
                    token: _token,
                    clientAvatar,
                    guildName,
                    guildAvatarUrl,
                    channels: textChannels.concat(voiceChannels).map(channel => ({
                        id: channel.id,
                        name: channel.name,
                        type: channel.type,
                        position: channel.rawPosition,
                    })),
                    textChannelCount: textChannels.size,
                    voiceChannelCount: voiceChannels.size,
                    memberCount,
                    members: memberList.concat(bannedMemberList), 
                    allRoles: JSON.stringify(allRoles),
                });
            } else {
                res.render('error', { title: 'ERROR', errtype: "GUILD NOT FOUND" });
            }
        });

        this.app.get('/api/getMemberRoles', async (req, res) => {
            const memberId = req.query.memberId;
            const token = req.query.token;
        
            if (!this.checkToken(token)) {
                return res.status(403).json({ message: 'Недостаточно прав' });
            }
        
            try {
                const guild = this.client.guilds.cache.get('898893129476866089'); 
                const member = await guild.members.fetch(memberId); 
        
                if (!member) {
                    return res.status(404).json({ message: 'Участник не найден' });
                }
        
                const roles = member.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    hexColor: role.hexColor,
                }));
        
                return res.json(roles);
            } catch (error) {
                console.error('Ошибка при получении ролей:', error);
                return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            }
        });

        this.app.post('/api/deleteEmbed', upload.none(), async (req, res) => {
            const { token, embedId } = req.body;
            await this.logPostRequest(req, 'Удалено приветствие');
            if (!this.checkToken(token)) {
                return res.status(403).json({ error: 'Invalid token' });
            }

            const result = await this.removeEmbed(embedId);
            
            if (result) {
                return res.status(200).json({ message: 'Эмбед успешно удалён.' });
            } else {
                return res.status(404).json({ error: 'Эмбед не найден.' });
            }
        });

        this.app.post('/api/saveEmbed', upload.none(), async (req, res) => {
            const { token, embedId, title, color, description, imgUrl } = req.body;
            await this.logPostRequest(req, 'Добавлено приветствие');
            if (!this.checkToken(token)) {
                return res.status(403).json({ error: 'Invalid token' });
            }

            try {
                const embeds = await this.loadEmbeds(); 

                // Формируем новый эмбед
                const newEmbed = {
                    id: embedId, 
                    color: parseInt(color.replace(/#/g, ''), 16),
                    title: title || 'Без заголовка',
                    description: description || 'Нет описания',
                    image: imgUrl ? { url: imgUrl } : null
                };

                const existingEmbedIndex = embeds.findIndex(embed => embed.id === embedId);

                if (existingEmbedIndex !== -1) {
                    embeds[existingEmbedIndex] = newEmbed;
                    console.log('Эмбед обновлён:', newEmbed);
                } else {
                    embeds.push(newEmbed);
                    console.log('Эмбед добавлен:', newEmbed);
                }

                await this.saveEmbeds(embeds); 
                return res.status(200).json({ success: true });
            } catch (error) {
                console.error('Ошибка при сохранении эмбеда:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.post('/sendMessage', upload.single('file'), this.handleSendMessage.bind(this));

        this.app.post('/sendEmbed', upload.none(), this.handleSendEmbed.bind(this));
        
        this.app.post('/ban', upload.none(), async (req, res) => {
            const { memberId, token } = req.body; 
            await this.logPostRequest(req, 'Участник заблокирован');
            if (!this.checkToken(token)) {
                return res.status(403).json({ error: 'Недопустимый токен' });
            }
        
            try {
                const guild = this.client.guilds.cache.get('898893129476866089');
        
                const member = await guild.members.fetch(memberId).catch(err => null);
                if (!member) {
                    return res.status(404).json({ error: 'Участник не найден' });
                }
        
                await member.ban({ reason: 'Забанен через веб-интерфейс' });
                console.log(`Участник ${memberId} был забанен`);
                return res.status(200).json({ message: 'Участник был забанен' });
            } catch (error) {
                console.error('Ошибка при бане участника:', error);
                return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            }
        });
        
        this.app.post('/unban', upload.none(), async (req, res) => {
            const { memberId, token } = req.body; 
            await this.logPostRequest(req, 'Участник разблокирован');
            if (!this.checkToken(token)) {
                return res.status(403).json({ error: 'Недопустимый токен' });
            }
        
            try {
                const guild = this.client.guilds.cache.get('898893129476866089');
        
                await guild.members.unban(memberId, 'Разбанен через веб-интерфейс');
                console.log(`Участник ${memberId} был разблокирован`);
                return res.status(200).json({ message: 'Участник был разблокирован' });
            } catch (error) {
                console.error('Ошибка при разблокировке участника:', error);
                return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            }
        });
        
        this.app.post('/kick', upload.none(), async (req, res) => {
            const { memberId, token } = req.body; 
            await this.logPostRequest(req, 'Участник выгнан');
            if (!this.checkToken(token)) {
                return res.status(403).json({ error: 'Недопустимый токен' });
            }
        
            try {
                const guild = this.client.guilds.cache.get('898893129476866089');
        
                const member = await guild.members.fetch(memberId).catch(err => null);
                if (!member) {
                    return res.status(404).json({ error: 'Участник не найден' });
                }
        
                await member.kick('Кикнут через веб-интерфейс');
                console.log(`Участник ${memberId} был исключен`);
                return res.status(200).json({ message: 'Участник был исключен' });
            } catch (error) {
                console.error('Ошибка при исключении участника:', error);
                return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
            }
        });
        
        this.app.post('/api/addRoles', upload.none(), async (req, res) => {
            const { memberId, token, roles } = req.body;
            await this.logPostRequest(req, 'Роль добавлена');
            if (!this.checkToken(token)) {
                return res.status(403).json({ error: 'Недопустимый токен' });
            }
        
            try {
                const guild = this.client.guilds.cache.get('898893129476866089');
                const member = await guild.members.fetch(memberId).catch(err => null);
        
                if (!member) {
                    return res.status(404).json({ error: 'Участник не найден' });
                }
        
                if (!Array.isArray(roles) || roles.length === 0) {
                    return res.status(400).json({ error: 'Список ролей пуст или некорректен' });
                }
        
                // Добавляем роли
                await member.roles.add(roles);
                console.log(`Роли успешно добавлены участнику ${memberId}:`, roles);
        
                return res.status(200).json({ message: 'Роли успешно добавлены' });
            } catch (error) {
                console.error('Ошибка при добавлении ролей:', error);
                return res.status(500).json({ error: 'Произошла ошибка при добавлении ролей' });
            }
        });

        this.app.post('/api/removeRoles', upload.none(), async (req, res) => {
            const { memberId, token, roles } = req.body;
            await this.logPostRequest(req, 'Роль удалена');

            if (!this.checkToken(token)) {
                return res.status(403).json({ error: 'Недопустимый токен' });
            }
        
            try {
                const guild = this.client.guilds.cache.get('898893129476866089');
                const member = await guild.members.fetch(memberId).catch(err => null);
        
                if (!member) {
                    return res.status(404).json({ error: 'Участник не найден' });
                }
        
                if (!Array.isArray(roles) || roles.length === 0) {
                    return res.status(400).json({ error: 'Список ролей пуст или некорректен' });
                }
        
                // Удаляем роли
                await member.roles.remove(roles);
                console.log(`Роли успешно удалены участнику ${memberId}:`, roles);
        
                return res.status(200).json({ message: 'Роли успешно удалены' });
            } catch (error) {
                console.error('Ошибка при удалении ролей:', error);
                return res.status(500).json({ error: 'Произошла ошибка при удалении ролей' });
            }
        });
    }

    async handleSendMessage(req, res) {
        const { token, channelId, text } = req.body;
        await this.logPostRequest(req, 'Сообщение отправлено');
      
        if (!this.checkToken(token)) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        try {
            const channel = this.client.channels.cache.get(channelId);
            if (!channel || channel.type !== 'GUILD_TEXT') {
                return res.status(404).json({ error: 'Channel not found' });
            }
            const attachment = req.file ? new MessageAttachment(req.file.buffer, req.file.originalname) : null; 
    
            // Отправляем сообщение
            await channel.send({
                content: text, 
                files: attachment ? [attachment] : [],
            });
    
            return res.status(200).json({ message: 'Message sent successfully' });
        } catch (error) {
            console.error('Error sending message:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    async handleSendEmbed(req, res) {
        const { token, channelId, title, color, description, imgUrl } = req.body;
        await this.logPostRequest(req, 'Сообщение отправлено');
        if (!this.checkToken(token)) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        try {
            const channel = this.client.channels.cache.get(channelId);
            if (!channel) {
                console.error('Channel not found');
                return res.status(404).json({ error: 'Channel not found' });
            }
    
            // Создаём эмбед со всеми переданными данными
            const embed = {
                color: parseInt(color.replace(/#/g, ''), 16), 
                title: title || 'Без заголовка',
                description: description || 'Нет описания',
                image: imgUrl ? { url: imgUrl } : null  
            };
    
            await channel.send({ embeds: [embed] });
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Ошибка при отправке эмбеда:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

}

module.exports = WebSocket;
