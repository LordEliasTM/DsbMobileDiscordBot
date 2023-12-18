import "dotenv/config";
import { REST, Routes } from "discord.js";

const commands = [
  {
    name: "dsb",
    description: "Jutta soll mal krank bleiben",
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), { body: commands });
  }
  catch (e) {
    console.error(e);
  }
})();
