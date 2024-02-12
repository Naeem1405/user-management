import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import dotenv from "dotenv";
const data = dotenv.config();

const mongo_username = "jipeye3596";
const mongo_pass = process.env.mongo_pass;
const mongo_uri = `mongodb+srv://jipeye3596:${mongo_pass}@usersdb.vjelmaj.mongodb.net/?retryWrites=true&w=majority`;

await mongoose.connect(mongo_uri);
const userScheme = mongoose.Schema({
	username: String,
	password: String,
	level: String,
	role: String,
	description: String,
	is_deleted: Boolean,
	blogs: [
		{
			title: String,
			body: String,
		},
	],
});

const userModel = mongoose.model("user", userScheme);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
var logged_in = false;
var logged_user = {};

app.listen(3000, () => {
	console.log("app is running");
});

app.get("/", (req, res) => {
	res.render("index.ejs", { logged_in: logged_in, user: logged_user });
});

app.get("/login", (req, res) => {
	res.render("login.ejs", { msg: req.query.msg });
});

app.post("/login", async (req, res) => {
	const usr_name = req.body.username;
	const usr_pass = req.body.password;
	const usr = await userModel.find({ username: usr_name });
	if (usr.length == [] || usr[0].is_deleted == true) {
		return res.redirect("/login?msg=nousr");
	} else if (usr[0].password == usr_pass) {
		logged_in = true;
		logged_user = usr[0];
		return res.redirect("/");
	} else {
		return res.redirect("/login?msg=passerror");
	}
});

app.get("/register/:level", (req, res) => {
	res.render("register.ejs", { level: req.params.level, msg: req.query.msg });
});

app.post("/register/:level", async (req, res) => {
	var user_role = "";
	var user_des = "";
	if (req.params.level == "0") {
		user_role = "super admin";
		user_des = "I own everything";
	} else if (req.params.level == "1") {
		user_role = "admin";
		user_des = "I can manage moderators";
	} else if (req.params.level == "2") {
		user_role = "moderator";
		user_des = "I can create posts";
	} else if (req.params.level == "3") {
		user_role = "user";
		user_des = "I can just browse";
	}

	const exist = await userModel.find({ username: req.body.username });
	if (exist.length != 0) {
		return res.redirect(`/register/${req.params.level}?msg=failed`);
	} else {
		const new_user = userModel({
			username: req.body.username,
			password: req.body.password,
			level: req.params.level,
			role: user_role,
			is_deleted: false,
			description: user_des,
			blogs: [],
		});
		new_user.save();
		return res.redirect(`/register/${req.params.level}?msg=success`);
	}
});

app.get("/blogs", (req, res) => {
	if (logged_in == true) {
		res.render("blog.ejs", {
			blogs: logged_user.blogs,
			level: logged_user.level,
		});
	} else {
		res.redirect("/login");
	}
});
app.get("/blogs/:idx", (req, res) => {
	if (logged_in == true) {
		res.render("post.ejs", {
			post: logged_user.blogs[parseInt(req.params.idx)],
		});
	} else {
		res.redirect("/login");
	}
});

app.get("/create", (req, res) => {
	if (logged_in == true) {
		if (logged_user.level < 3) {
			res.render("create.ejs");
		} else {
			res.send(
				`<h1>don't have access</h1><a href="/"><button>Home</button></a>`
			);
		}
	} else {
		res.redirect("/login");
	}
});

app.post("/create", async (req, res) => {
	if (logged_in) {
		await userModel.updateOne(
			{ username: logged_user.username },
			{ $push: { blogs: { title: req.body.title, body: req.body.body } } }
		);
		await update_data();

		return res.redirect("/blogs");
	} else {
		return res.redirect("/login");
	}
});

app.get("/logout", (req, res) => {
	logged_in = false;
	logged_user = {};
	res.redirect("/");
});

async function update_data() {
	var _user = await userModel.find({ username: logged_user.username });
	logged_user = _user[0];
}

app.get("/manage", async (req, res) => {
	if (logged_in) {
		if (logged_user.level < "2") {
			const data = await userModel.find({
				username: { $ne: logged_user.username },
			});
			return res.render("manage.ejs", { data: data });
			// return res.send("hi");
		} else {
			return res.send(
				`<h1>don't have access</h1><a href="/"><button>Home</button></a>`
			);
		}
	} else {
		return res.redirect("/login");
	}
});

app.get("/delete/:usr_name", async (req, res) => {
	if (logged_in) {
		if (logged_user.level < 2) {
			const usr = await userModel.find({ username: req.params.usr_name });
			if (usr[0].level > logged_user.level) {
				await userModel.updateOne(
					{ username: req.params.usr_name },
					{ $set: { is_deleted: true } }
				);
				return res.redirect("/manage");
			} else {
				res.send(
					`<h1>don't have access</h1><a href="/manage"><button>Manage Users</button></a>`
				);
			}
		} else {
			res.send(
				`<h1>don't have access</h1><a href="/manage"><button>Manage Users</button></a>`
			);
		}
	} else {
		return res.redirect("/login");
	}
});

app.get("/permanentdelete/:usr_name", async (req, res) => {
	if (logged_in) {
		if (logged_user.level == 0) {
			const usr = await userModel.find({ username: req.params.usr_name });
			if (usr[0].level > logged_user.level) {
				await userModel.deleteOne({ username: req.params.usr_name });
			}
			return res.redirect("/manage");
		} else {
			res.send(
				`<h1>don't have access</h1><a href="/manage"><button>Manage Users</button></a>`
			);
		}
	} else {
		return res.redirect("/login");
	}
});
