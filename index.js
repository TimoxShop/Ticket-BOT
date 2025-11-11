const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;

// Configuration des catégories de tickets
const ticketCategories = {
    support: {
        name: 'Support',
        description: 'Aide générale et support technique',
        gif: 'https://s3.getstickerpack.com/storage/uploads/sticker-pack/pepe-frog-gifs/sticker_16.gif?9932887806117710c4abd7a780349f7a'
    },
    boutique: {
        name: 'Boutique',
        description: 'Questions sur la boutique',
        gif: 'https://s3.getstickerpack.com/storage/uploads/sticker-pack/pepe-frog-gifs/sticker_7.gif?9932887806117710c4abd7a780349f7a'
    },
    plainte: {
        name: 'Plainte',
        description: 'Signaler un problème ou une plainte',
        gif: 'https://s3.getstickerpack.com/storage/uploads/sticker-pack/pepe-frog-gifs/sticker_19.gif?9932887806117710c4abd7a780349f7a'
    }
};

client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
    
    // Enregistrer les commandes slash
    const commands = [
        {
            name: 'setup',
            description: 'Configure le système de tickets dans ce salon'
        }
    ];

    try {
        await client.application.commands.set(commands);
        console.log('✅ Commandes slash enregistrées !');
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    // Commande slash /setup
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Vous devez être administrateur pour utiliser cette commande !',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('📩 Ouvrir un tickets')
                .setDescription('🎬 Vous souhaitez ouvrir un ticket ?\nMerci de bien choisir la catégorie correspondant à votre demande :\n\n💎 Ticket Général\n🏪 Ticket Boutique\n⚠️ Ticket Plainte Staff')
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_category')
                .setPlaceholder('Choisissez une catégorie')
                .addOptions([
                    {
                        label: 'Support',
                        description: 'Aide générale et support',
                        value: 'support',
                        emoji: '🎟️'
                    },
                    {
                        label: 'Boutique',
                        description: 'Questions sur la boutique',
                        value: 'boutique',
                        emoji: '🏪'
                    },
                    {
                        label: 'Plainte',
                        description: 'Signaler un problème',
                        value: 'plainte',
                        emoji: '📢'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({
                content: '✅ Système de tickets configuré avec succès !',
                ephemeral: true
            });
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_category') {
            await interaction.deferReply({ ephemeral: true });

            const category = interaction.values[0];
            const guild = interaction.guild;
            const member = interaction.member;

            // Vérifier si l'utilisateur a déjà un ticket ouvert
            const existingTicket = guild.channels.cache.find(
                ch => ch.name === `ticket-${member.user.username.toLowerCase()}` && ch.type === ChannelType.GuildText
            );

            if (existingTicket) {
                return interaction.editReply({
                    content: '❌ Vous avez déjà un ticket ouvert !',
                    ephemeral: true
                });
            }

            try {
                // Créer le canal de ticket
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${member.user.username}`,
                    type: ChannelType.GuildText,
                    parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory
                            ]
                        }
                    ]
                });

                // Message d'accueil dans le ticket
                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`🎫 Ticket ${ticketCategories[category].name}`)
                    .setDescription(`Bienvenue ${member} !\n\nVotre ticket a été créé dans la catégorie **${ticketCategories[category].name}**.\n\nUn membre du staff va vous répondre sous peu.\n\n**Catégorie:** ${ticketCategories[category].description}`)
                    .setImage(ticketCategories[category].gif)
                    .setTimestamp()
                    .setFooter({ text: 'Système de tickets' });

                const closeButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Fermer le ticket')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(closeButton);

                await ticketChannel.send({
                    content: `${member}`,
                    embeds: [welcomeEmbed],
                    components: [row]
                });

                await interaction.editReply({
                    content: `✅ Votre ticket a été créé : ${ticketChannel}`,
                    ephemeral: true
                });

            } catch (error) {
                console.error('Erreur lors de la création du ticket:', error);
                await interaction.editReply({
                    content: '❌ Une erreur est survenue lors de la création du ticket.',
                    ephemeral: true
                });
            }
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'close_ticket') {
            const channel = interaction.channel;

            const confirmEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ Confirmation de fermeture')
                .setDescription('Êtes-vous sûr de vouloir fermer ce ticket ?');

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_close')
                .setLabel('✅ Confirmer')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.customId === 'confirm_close') {
            await interaction.update({
                content: '🔒 Fermeture du ticket dans 5 secondes...',
                embeds: [],
                components: []
            });

            setTimeout(async () => {
                await interaction.channel.delete();
            }, 5000);
        }

        if (interaction.customId === 'cancel_close') {
            await interaction.update({
                content: '✅ Fermeture annulée.',
                embeds: [],
                components: []
            });
        }
    }
});

client.login(TOKEN);
