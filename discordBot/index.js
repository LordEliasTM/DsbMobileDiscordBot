import { Client, Events, GatewayIntentBits } from "discord.js";
import { getDsbImage } from "../dsbParser/index.js";
import "dotenv/config";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


client.on("interactionCreate", async interaction => {
	if (!interaction.isChatInputCommand()) return;
	if (!interaction.commandName == "dsb") return;

	interaction.deferReply();

	const dsbImagePath = await getDsbImage();

	interaction.editReply({files: [{attachment: dsbImagePath}]});
})


client.login(process.env.BOT_TOKEN);
