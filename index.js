const TelegramBot = require('node-telegram-bot-api');

const sqlite = require('sqlite-sync'); //requiring

//Connecting - if the file does not exist it will be created
sqlite.connect('library.db'); 

const config=require('./config.json');

//Creating table - you can run any command
// sqlite.run(`CREATE TABLE messages(
//   id  INTEGER PRIMARY KEY AUTOINCREMENT, 
//   key TEXT NOT NULL UNIQUE,
//   from_id INTEGER NOT NULL,
//   message_id INTEGER NOT NULL
//   );`,function(res){
// 	if(res.error)
// 		throw res.error;
// });

 //Inserting - this function can be sync to, look the wiki
//  sqlite.insert("messages",{
//   key:"Test",
//   from_id:764350003, 
//   message_id:75
// });
 
// sqlite.insert("messages",{
//   key:"Hello",
//   from_id:764350003, 
//   message_id:73
// });

console.log(sqlite.run('SELECT * FROM messages'));

// replace the value below with the Telegram token you receive from @BotFather
const token = config.token;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, 
  {
    polling: true,
    filepath:false
  });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'This bot allows you to bookmark messages.\n'
      + 'To add message use command:\n'
      + '`/add key`\n'
      + 'To list messages use command:\n'
      + '`/list`\n'
      + 'To remove message use command:\n'
      + '`/remove key`\n'
      , {parse_mode: 'markdown'});
  });

bot.onText(/\/get ([^;'\"]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const key = match[1]; // the captured "whatever"
  const message=getMessage(key);

  if(message.exists){
    bot.forwardMessage(chatId,message.from_id,message.message_id);
  } 

});

const addMode={};
bot.onText(/\/add ([^;'\"]+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const key = match[1]; // the captured "whatever"
  var text='';
  if(isMessageExists(key)){
    text='Извините,сообщение с таким ключем уже существует.';  
  } else{
    addMode[chatId]={key:key,from:msg.from.id};
    text='Теперь пришлите сообщение которое нужно сохранить.' + 'либо отмените /cancel';  
  }
bot.sendMessage(chatId,text);
});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
  if (!(chatId in addMode)) 
    return;
    if (typeof(msg.text) !== 'undefined' && msg.text.toLowerCase() == "/cancel") {
      delete addMode[msg.chat.id];
      return;
  }
  
  const row=addMode[chatId];

  sqlite.insert("messages",{
    key:row.key,
    from_id:row.from, 
    message_id:msg.message_id
  },function(res){
    if(res.error){
    bot.sendMessage(chatId,'Добавить сообщение не вышло.Попробуй позже.');
      throw res.error; 
    }
    bot.sendMessage(chatId,'Сообщение сохранено успешно');
  });
  delete addMode[chatId]; 
  });

  bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    const data = sqlite.run(
      "SELECT `key` FROM messages WHERE `from_id` = ?",
       [fromId]);
    if (data.length == 0) {
      bot.sendMessage(chatId, 'You have not added anything.');
      return;
    }
    var lines = [];
    data.forEach(function(element) {
      lines.push('`' + element.key + '`');
    });
    bot.sendMessage(chatId, lines.join(', '), {parse_mode: 'markdown'});
  });

  bot.onText(/\/remove ([^;'\"]+)/, (msg, match) => {
    const key = match[1]; // the captured "whatever"
    const message=getMessage(key);
    if (!message.exists)return;
    if (message.from_id!=msg.from.id)return;
    sqlite.delete('messages',{'key':key},function(res){
      if (!res.error) {
        bot.sendMessage(msg.chat.id,'Message successfully deleted!');
      }
    });
  });

function isMessageExists(key){
  return sqlite.run("SELECT COUNT(*) as cnt FROM messages WHERE `key`=?",[key])[0].cnt != 0;
}

function getMessage(key){
 const data = sqlite.run(
  "SELECT * FROM messages WHERE `key`=? LIMIT 1"
 ,[key]);
if (data.length == 0) {
  return {exists:false};
}
data[0].exists=true;
return data[0];
}

// Listen for any kind of message. There are different kinds of
// messages.
// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;

//   // send a message to the chat acknowledging receipt of their message
//   bot.sendMessage(chatId, JSON.stringify(msg));
// });
