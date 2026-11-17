const fs = require("fs");
const bcrypt = require("bcrypt");
require("dotenv").config();

async function main() {
const hash = await bcrypt.hash("MyNewPassword123", 12);

let env = fs.readFileSync(".env", "utf8");

env = env.replace(
/^ADMIN_HASH=.*$/m,
() => "ADMIN_HASH="+ hash
);

fs.writeFileSync(".env", env);

console.log("Хеш обновлён!");
console.log("Длина:", hash.length);
console.log("Пароль совпадает:", await bcrypt.compare("MyNewPassword123", hash));
}

main().catch(console.error);