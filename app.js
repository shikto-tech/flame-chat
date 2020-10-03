const http = require('http');
const fs = require('fs');
var url = require('url');
var path = require('path');
const port = process.env.PORT || 8080
var result = "";
var q;
var qdata;

const server = http.createServer((req, res) => {
	q = url.parse(req.url, true);
	qdata = q.query;	
  	res.statusCode = 200;
  	res.setHeader('Content-Type', 'text/html');
	
	if(qdata.method == 'login' && qdata.token != null){
		login();
	}else if(qdata.method == 'check_email' && qdata.email != null){
		check_email();
	}else if(qdata.method == 'create' && qdata.email != null && qdata.name != null){
		create();
	}else if(qdata.method == 'get_chat' && qdata.group != null && qdata.email != null && qdata.last_received_message != null){
		get_chat();
	}else if(qdata.method == 'new_message' && qdata.group != null && qdata.email != null && qdata.message != null){
		new_message();
	}else if(qdata.method == 'add_group' && qdata.group_name != null && qdata.email != null && qdata.last_received_message != null){
		add_group();
	}else if(qdata.method == 'get_all_user'){
		get_all_user();
	}
	
	//console.log(result);
  	res.end(result);	
});

server.listen(port,() => {
  	console.log(`Server running at port `+port);
});

//-------------------
function login(){
	if(qdata.token != ""){
		var username = read(path.resolve("database/token/" + qdata.token + ".txt"));
		if(username != ""){
			var user_data = read(path.resolve("database/user/" + username + ".json"));
			result = user_data;
		}
	}else{
		res.write("no token");
	}
}

function check_email(){
	if(qdata.email != ""){
	   	var user = read(path.resolve("database/user/" + qdata.email + ".json"));
		if(user != ""){
		   	result = user;
	   	}else{
			result = "no_email";
		}
   	}
}

function create(){
	if(qdata.email != "" && qdata.name != ""){
		var default_user_data = JSON.parse(read(path.resolve("default_user_data.txt")));
		default_user_data.name = qdata.name;
		update((path.resolve("database/user/" + qdata.email + ".json")), JSON.stringify(default_user_data));
		result = JSON.stringify(default_user_data);
		new_event("@Create attempt, success, email:" + qdata.email + "name:" + qdata.name);
	}else{
		new_event("Create attempt, fail, email:" + qdata.email + "name:" + qdata.name);
	}
}

function get_chat(){
	if(qdata.email != "" && qdata.last_received_message != ""){
	 	var user = JSON.parse(read(path.resolve("database/user/" + qdata.email + ".json")));
		var is_in_group = false;
		for(var k in user.group){
			if(k == qdata.group){
			   is_in_group = true;
				break;
		   	}
		}
		if(is_in_group){
		   var member_data = JSON.parse(read(path.resolve("database/chat/" + qdata.group + "/member_data/" + qdata.email + ".json")));
						
			
			var lst_msg_r = "";			
			while(lst_msg_r == ""){
				  lst_msg_r = read(path.resolve("database/chat/" + qdata.group + "/last_message.json"));
		  	}
			var last_message = JSON.parse(lst_msg_r);
			
			var l_r_m_i = parseInt(qdata.last_received_message);
			//console.log(l_r_m_i);
			if(parseInt(last_message.id) > l_r_m_i){
			   	var full_chat = "";
				full_chat = read(path.resolve("database/chat/" + qdata.group + "/chat.json")).toString();
				var b_full_chat = full_chat.split("\n*###*\n"); 
				
				var f_chat = "";
				for(var k in b_full_chat){
					
					var this_msg = JSON.parse(b_full_chat[k]);
					
					if(parseInt(this_msg.id) > l_r_m_i){
					   f_chat += "\n*###*\n" + JSON.stringify(this_msg);
				   	}
					//console.log(f_chat);
				}
				if(f_chat != ""){
				   f_chat = f_chat.substring(6);
			   	}
				result = f_chat;
				
				if(member_data.last_seen_message < last_message.id){
				   member_data.last_seen_message = last_message.id;
			   	}
				
				update(path.resolve("database/chat/" + qdata.group + "/member_data/" + qdata.email + ".json"), JSON.stringify(member_data));
		   	}else{
				result = "1";
			}
	   	}
		
   	}else{
		result = "no email entered";
	}
	
}

function new_message(){
	if(qdata.email != "" && qdata.group != "" && qdata.message != ""){
	 	var user = JSON.parse(read(path.resolve("database/user/" + qdata.email + ".json")));
		var is_in_group = false;
		for(var k in user.group){
			if(k == qdata.group){
			   is_in_group = true;
				break;
		   	}
		}
		if(is_in_group){
			var default_msg = JSON.parse(read(path.resolve("default_new_msg.json")));
			
			var lst_msg_r = "";			
			while(lst_msg_r == ""){
				  lst_msg_r = read(path.resolve("database/chat/" + qdata.group + "/last_message.json"));
		  	}
			var last_message = JSON.parse(lst_msg_r);
			
			last_message.id = (parseInt(last_message.id) + 1) + "";
			last_message.message = qdata.message;
			update(path.resolve("database/chat/" + qdata.group + "/last_message.json"), JSON.stringify(last_message));
			
			default_msg.id = last_message.id;
			default_msg.message = qdata.message;
			default_msg.timestamp = Date.now().toString();
			default_msg.sender = qdata.email;
			add(path.resolve("database/chat/" + qdata.group + "/chat.json"), "\n*###*\n" + JSON.stringify(default_msg));
			result = last_message.id;
	   	}
		
   	}else{
		result = "no email entered";
	}
}

function add_group(){
	
}

function get_all_user(){
	var all_users = {};
	const testFolder = path.resolve("database/user/");
	fs.readdirSync(testFolder).forEach(file => {
		var uid = file;
		var this_user_data = JSON.parse(read(path.resolve("database/user/" + file)));
		//console.log(read(path.resolve("default_user_data.txt")));
		all_users[uid] = this_user_data;
		result = JSON.stringify(all_users);
	});
}

//----------------------------
function update(file, data){
	fs.writeFile(file, data, function (err) {});
}

function add(file, data){
	fs.appendFile(file, data, function (err) {});
}

function read(file){
	if (fs.existsSync(file)) {
		return fs.readFileSync(file, "utf-8");
	}else{
		return "";
	}
}

function json_to_key_list(json_data){
	var j_result = "";
	for(var k in json_data) {
		if(json_data[k] instanceof Object) {
		} else {
			j_result += "," + k;
		}
	}
	return j_result.substring(1);
}

function json_to_value_list(json_data){
	var j_result = "";
	for(var k in json_data) {
		if(json_data[k] instanceof Object) {
		} else {
			j_result += "," + json_data[k];
		}
	}
	return j_result.substring(1);
}

function new_event(value){
	console.log("@" + Date.now().toString() + value);
}