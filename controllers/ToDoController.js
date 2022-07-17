const ToDo=require("./../models/ToDo");


module.exports.getToDo = async(req, res)=>{
    const Todo = await ToDo.find();
    res.send(Todo);
}

module.exports.saveToDo = async (req,res)=>{
    const {text, self, assignee, deadline} = req.body;

    ToDo
        .create({text, self, assignee, deadline})
        .then(()=>res.set(201).send("Added Successfully"))
        .catch((err)=>console.log(err))
}

module.exports.deleteToDo = async (req,res)=>{
    const {_id} = req.body;
        ToDo
            .find({_id})
            .then((data)=>{
                if(data[0].self){
                    ToDo
                        .findByIdAndDelete(_id)
                        .then(()=>res.set(201).send("Deleted Successfully"))
                        .catch((err)=>console.log(err))
                }else{
                    res.send("Sorry you cannot delete this task. You don't have rights")
                }
            })
            .catch((err)=>console.log(err))    
}

module.exports.updateToDo = async (req,res)=>{
    const {_id, text} = req.body;
    ToDo
        .find({_id})
        .then((data)=>{
            if(data[0].self){
                ToDo
                    .findByIdAndUpdate(_id,{text})
                    .then(()=>res.send(201).send("Updated Successfully"))
                    .catch((err)=>console.log(err))
            }else{
                res.send("Sorry you cannot update this task. You don't have rights")
            }
        })
}