const express = require("express");
const router = express.Router();

const User=require("./../models/User");

const UserVerification=require("./../models/UserVerification");

const {getToDo, saveToDo, deleteToDo, updateToDo} = require("./../controllers/ToDoController");
const nodemailer = require("nodemailer");


const {v4: uuidv4} = require("uuid");

require("dotenv").config();


const bcrypt = require("bcrypt");

const path = require("path");


let transporter = nodemailer.createTransport({
    service:'gmail',    
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
})

//testing transporter
transporter.verify((error, success)=>{
    if(error){
        console.log(error);
    }
    else{
        console.log("Ready");
        console.log(success);
    }
})

router.post("/signup",(req,res)=>{
    let {name, email, password} = req.body;
    name=name.trim();
    email=email.trim();
    password=password.trim();

    if(name==""||email==""||password==""){
        res.json({
            status:"FAILED",
            message: "Empty input fields",
        });
    }else if(!/^[a-zA-Z ]*$/.test(name)){
        res.json({
            status:"FAILED",
            message: "Invalid name",
        });
    }else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
        res.json({
            status:"FAILED",
            message: "Invalid email",
        });
    }else if(password.length<8){
        res.json({
            status:"FAILED",
            message: "Password too short",
        });
    }else{
        User.find({email})
            .then((result)=>{
                if(result.length){
                    //user exists
                    res.json({
                        status:"FAILED",
                        message:"User already exists",
                    });
                }else{
                    //creating a new user

                    const saltRounds = 10;
                    bcrypt
                        .hash(password, saltRounds)
                        .then((hashedPassword)=>{
                            const newUser = new User({
                                name,
                                email,
                                password: hashedPassword,
                                verified: false,
                            });
                            newUser
                                .save()
                                .then((result)=>{
                                    //hadling verification email
                                    sendVerificationEmail(result, res);
                                })
                                .catch((err)=>{
                                    res.json({
                                        status:"FAILED",
                                        message: "Error occured during saving user account",
                                    });
                                })
                        })
                        .catch((err)=>{
                            res.json({
                                status:"FAILED",
                                message: "Error occured during hashing password",
                            });
                        })
                }
            })
            .catch((err)=>{
                console.log(err);
                res.json({
                    status:"FAILED",
                    message: "Error occured during checking for existing user",
                });
            })
    }
});


const sendVerificationEmail = ({_id, email}, res)=>{
    const currentUrl = "http://localhost:5000/";

    const uniqueString = uuidv4() + _id;

    //mail options
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Please Verify Your Email",
        html: `<p>Salutation from celebal technologies team.</p> <p>Please verify your email address to complete the sign up process and continue to login to the portal.</p> <p> <p><a href=${currentUrl+"user/verify/"+ _id +"/"+uniqueString}>Click Here</a></p><b>link will expire in 5 mins</b>.</p>`
    };

    //hashing the uniqueString
    const saltRounds = 10;
    bcrypt
        .hash(uniqueString,saltRounds)
        .then((hashedUniqueString)=>{
            //set values in userVerification collection
            const newVerification = new UserVerification({
                userId: _id,
                uniqueString: hashedUniqueString,
                createdAt: Date.now(),
                expiresAt: Date.now()+300000,
            });
            newVerification
            .save()
            .then(()=>{
                transporter
                .sendMail(mailOptions)
                .then(()=>{
                    res.json({
                        status: "PENDING",
                        message: "Verification email sent",
                    });
                })
                .catch((error)=>{
                    console.log(error);
                    res.json({
                        status: "FAILED",
                        message: "Error in email verification",
                    });
                })
            })
            .catch((error)=>{
                console.log(error);
                res.json({
                    status: "FAILED",
                    message: "Error in save verification email data"
                });
            })
        })
        .catch(()=>{
            res.json({
                status: "FAILED",
                message: "Error occured while hashing email details"
            });
        })
}


//verify email
router.get("/verify/:userId/:uniqueString",(req,res)=>{
    let{userId, uniqueString} = req.params;
    UserVerification
        .find({userId})
        .then((result)=>{
            if(result.length>0){
                //user verification records exists
                const{expiresAt} = result[0];
                const hashedUniqueString = result[0].uniqueString;
                if(expiresAt<Date.now()){
                    //record expired
                    UserVerification
                        .deleteOne({userId})
                        .then(result=>{
                            User
                                .deleteOne({_id: userId})
                                .then(()=>{
                                    message = "Error verification link expired. Signup again!";
                                    res.redirect(`/user/verified/error=true&message=${message}`);

                                })
                                .catch(error=>{
                                    let message = "Error occurred while deleting expired user verification details";
                                    res.redirect(`/user/verified/error=true&message=${message}`);
                                })
                        })
                        .catch((error)=>{
                            console.log(error);
                                message = "Error occurred while clearing expired user verification";
                                res.redirect(`/user/verified/error=true&message=${message}`);
                        })
                }else{
                    //valid record exists
                    //compare hashed unique string
                    bcrypt
                        .compare(uniqueString,hashedUniqueString)
                        .then(result=>{
                            if(result){
                                //strings match
                                User
                                    .updateOne({_id: userId},{verified: true})
                                    .then(()=>{
                                        UserVerification
                                            .deleteOne({userId})
                                            .then(()=>{
                                                res.sendFile(path.join(__dirname,"../views/verified.html"));
                                            })
                                            .catch(error=>{
                                                let message = "Error while deleting userverification after successful verification";
                                                res.redirect(`/user/verified/error=true&message=${message}`);
                                            })
                                    })
                                    .catch(error=>{
                                        let message = "Error while updating user record verified to true";
                                        res.redirect(`/user/verified/error=true&message=${message}`);
                                    })
                            }else{
                                //existing record but incorrect verification details
                                let message = "Error of incorrect verification details";
                                res.redirect(`/user/verified/error=true&message=${message}`);
                            }
                        })
                        .catch(error=>{
                            let message = "Error in comparision of unique strings";
                            res.redirect(`/user/verified/error=true&message=${message}`);
                        })
                }
            }
            else{
                //user verification records doesn't exists
                let message = "Error of existance of user verification";
                res.redirect(`/user/verified/error=true&message=${message}`);
            }
        })
        .catch((error)=>{
            console.log(error);
            let message = "Error occurred while checking for existing user verification";
            res.redirect(`/user/verified/error=true&message=${message}`);
        })
});

//verified page route
router.get("/verified", (req,res)=>{
    res.sendFile(path.join(__dirname,"../views/verified.html"))
})


router.post("/signin", (req,res)=>{
    let {email, password} = req.body;
    email = email.trim();
    password = password.trim();

    if(email == "" || password == ""){
        res.json({
            status: "FAILED",
            message: "Empty input fields"
        });
    }else{
        User.find({email})
            .then((data)=>{
                if(data.length){
                    //User exists

                    //check user if user is verified

                    if(!data[0].verified){
                        res.json({
                            status: "FAILED",
                            message: "User is not verified",
                        });
                    }else{
                        const hashedPassword = data[0].password;
                        bcrypt
                            .compare(password, hashedPassword)
                            .then((result)=>{
                                if(result){
                                    //password matching
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Signin Successful",
                                        data: data,
                                    });
                                }else{
                                    res.json({
                                        status: "FAILED",
                                        message: "Invalid password",
                                    });
                                }
                            })
                            .catch((err)=>{
                                res.json({
                                    status: "FAILED",
                                    message: "Error while comparing passwords",
                                });
                            });
                    }            
                }else{
                    res.json({
                        status: "FAILED",
                        message: "Invalid input entered",
                    });
                }
            })
            .catch((err)=>{
                res.json({
                    status: "FAILED",
                    message: "Error while checking for existing user",
                });
            })
    }
})

router.get("/get", getToDo);
router.post("/save", saveToDo);
router.post("/delete", deleteToDo);
router.post("/update", updateToDo);



module.exports = router;