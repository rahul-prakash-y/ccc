const bcrypt = require("bcryptjs");
const hashPassword = async (password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
}
hashPassword("surya");