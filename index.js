require("./config/db");

const app = require("express")();
const port = process.env.PORT || 5000;
const cors = require("cors");
const UserRouter = require("./api/User");

//accepting post from data
const bodyParser = require("express").json;
app.use(bodyParser());
app.use("/user",UserRouter);
app.listen(port,()=>{
    console.log(`server running on port ${port}`);
})