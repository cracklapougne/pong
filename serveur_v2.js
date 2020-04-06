var app = require('express')();

var http = require('http').createServer(app);

var io = require('socket.io')(http);

var EventEmitter = require('events').EventEmitter;

var jeu = new EventEmitter();



//gestion des redirections
app.get('/', function(req,res){

    res.sendFile(__dirname + '/index.html');

});


//tous les utilisateurs depuis le lancement du serveur

var users =[];

//utilisateurs connectés (limité à 2)

var connected_users=[];

//position des buts des utilisateurs connectés
var buts=[];
var movedown1=false;
var movedown2=false;
var moveup1=false;
var moveup2=false;
//victoires par users

var victoires=[]

//messages à recharger

var messages_reload = {chateurs:[],chats:[]};

// combien de joueurs sont prêts à jouer ?

var readymetre=[];

var score =[0,0];

//setInterval pour les matchs
var repeat = null;
var clock=null;

//une partie est en cours
var game_on=false;

io.on('connection', function(socket) {
    //connected +=1;
    //console.log(connected);


    function buts_init() {
        buts[0]['y'] = (H-but_h)/2;
        buts[1]['y'] = (H-but_h)/2;
        y1 = (H-but_h)/2;
        y2 = (H-but_h)/2;
        moveup1=false;
        movedown1=false;
        movedown2=false;
        moveup2=false;
        //jeu.emit('update_1');
        //jeu.emit('update_2');
    }
    function balle_g(){
        balle_x = d2- balle_r-1;
        balle_y = H/2;
        balle_angle=0;
    }
    function balle_d(){
        balle_x = d1+ but_w + balle_r+1;
        balle_y = H/2;
        balle_angle=0;
    }
    function balle_m(){
        balle_x = W/2;
        balle_y = H/2;
        balle_angle=0;
    }

    //gérer le mouvement de la balle
    function anime_balle() {
        d1 = buts[0]['d'];
        d2 = buts[1]['d'];
        if (moveup1===undefined){}else if (moveup1){y1-=5}
        if (moveup2===undefined){}else if (moveup2){y2-=5}
        if (movedown1===undefined){}else if (movedown1){y1+=5}
        if (movedown2===undefined){}else if (movedown2){y2+=5}
        moveup1=false;
        movedown1=false;
        movedown2=false;
        moveup2=false;
        //y1 = buts[0]['y'];
        //y2 = buts[1]['y'];
        buts[0]['y']=y1;
        buts[1]['y']=y2;
        //on détermine le nouvel emplacement de la balle
        //si on touche le bord haut ou bas du canvas
        if (balle_y - balle_r <= 0 || balle_y + balle_r >= H) {
            balle_angle = -balle_angle;
        }
        //si on touche la raquette de gauche ou de droite
        if ((balle_x - balle_r <= d1 + but_w) && Math.abs(balle_y - y1 - but_h / 2) <= but_h / 2) {
            balle_direction = 1;
            balle_deviation = -(balle_y - (y1 + but_h / 2)) / (but_h / 2) * Math.PI / 4;
            balle_angle += balle_deviation;
            balle_x += balle_direction * balle_vitesse * Math.cos(balle_angle);
            balle_y -= balle_direction * balle_vitesse * Math.sin(balle_angle);
        }
        if ((balle_x + balle_r >= d2) && Math.abs(balle_y - y2 - but_h / 2) <= but_h / 2) {
            balle_direction = -1;
            balle_deviation = -(balle_y - (y2 + but_h / 2)) / (but_h / 2) * Math.PI / 4;
            balle_angle -= balle_deviation;
            balle_x += balle_direction * balle_vitesse * Math.cos(balle_angle);
            balle_y -= balle_direction * balle_vitesse * Math.sin(balle_angle);
        } else {
            balle_x += balle_direction * balle_vitesse * Math.cos(balle_angle);
            balle_y -= balle_direction * balle_vitesse * Math.sin(balle_angle);
        }
        //socket.emit('move_balle', [{'balle_x': balle_x, 'balle_y': balle_y, 'balle_r': balle_r},buts]);

        if ((balle_x + balle_r < d1) && (score[1] < 2)) {
            score = [score[0],score[1]+1];
            io.emit('score_update2',score);
            console.log('J2 a marqué');
            buts_init();
            balle_d();
            console.log(score);
        }
        if ((balle_x + balle_r < d1) && (score[1] === 2)) {
            score = [score[0],3]
            io.emit('score_update2',score);
            io.emit('W2');
            buts_init();
            balle_m();
            clearInterval(repeat);
            console.log('la repeat a été cleared')
            clearInterval(clock);
            console.log('la clock a été cleared');
            console.log(score);
            give_victoire(connected_users[1].name);
            readymetre=[];
            game_on=false;
            console.log('readymetre :'+readymetre);
            console.log('wins :'+JSON.stringify(victoires))

        }
        if ((balle_x-balle_r>d2+but_w) && (score[0] <2)){
            score = [score[0]+1,score[1]];
            io.emit('score_update1',score);
            console.log('J1 a marqué');
            buts_init();
            balle_g();
            console.log(score);
        }
        if((balle_x-balle_r>d2+but_w) && (score[0]===2)){
            score = [3,score[1]]
            io.emit('score_update1',score);
            io.emit('W1');
            buts_init();
            balle_m();
            clearInterval(repeat);
            console.log('la repeat a été cleared')
            clearInterval(clock);
            console.log('la clock a été cleared')
            console.log(score);
            give_victoire(connected_users[0].name);
            game_on=false;
            readymetre=[];
            console.log('readymetre :'+readymetre);
            console.log('wins :'+JSON.stringify(victoires))
        }
        }

    //réinitialiser la partie
    socket.on('reinitialize game',function(){
        score=[0,0];


    });

    //détails de la session de jeu
    socket.on('i want to know if game on',function(){
        socket.emit('serveur socket state of the game',game_on);
    });
    socket.on('i want to inform. game on ?',function(){
        console.log('game on ? '+game_on);
        socket.broadcast.emit('serveur broadcast state of the game',game_on);
    });

    socket.on('back to the game',function(){
        socket.broadcast.emit('opponent back to the game');
    });

    //victoire par forfait
    socket.on('give a win on forfait',function(user){
        buts_init();
        balle_m();
        clearInterval(repeat);
        console.log('la repeat a été cleared')
        clearInterval(clock);
        console.log('la clock a été cleared')
        console.log(score);
        game_on=false;
        readymetre=[];
        give_victoire(connected_users[0].name);
        socket.emit('Wforfait')
    })



    //déplacement des deux raquettes
    socket.on('movedown1',function(){
        if (socket.id===connected_users[0].num)
    {
        movedown1 = true
    }else{
        movedown2 = true
    }

        //buts[0]['y'] += 5;
        //jeu.emit('update1',buts);
    });
    socket.on('moveup1',function(){
        if (socket.id===connected_users[0].num)
        {
            moveup1 = true
        }else{
            moveup2 = true
        }
        //buts[0]['y'] -= 5;
        //jeu.emit('update1',buts);
    });
    socket.on('movedown2',function(){
        if (socket.id===connected_users[1].num)
    {
        movedown2 = true
    }else{
        movedown1 = true
    }
        //buts[1]['y'] += 5;
        //jeu.emit('update2',buts);
    });
    socket.on('moveup2',function(){
        if (socket.id===connected_users[1].num)
        {
            moveup2 = true
        }else{
            moveup1 = true
        }
        //buts[1]['y'] -= 5;
        //jeu.emit('update2',buts);
    });

    //jeu.on('begin', function(begin){
      //  socket.emit('begin', 'le jeu peut commencer');
      //  var clock = setTimeout(function(){setInterval(function(){anime_balle()}, 1000/60)}, 3000);
   // });

    //début de partie

    socket.on('ready',function(){
        if (readymetre.includes(socket.id)){
        }
        else{
            readymetre.push(socket.id);
        console.log('readymetre :'+readymetre);
        if (readymetre.length===2){
            buts_init();
            balle_m();
            clearInterval(clock);
            console.log('la clock a été cleared');
            clearInterval(repeat);
            console.log('la repeat a été cleared');
            clock = null;
            repeat=null;
            setTimeout(function(){
                clock = setInterval(update, 1000/60);
                console.log('la clock a été set');
                repeat = setInterval(function(){anime_balle()}, 1000/60);
                console.log('la repeat a été set')
            }, 6000);
            score=[0,0];
            game_on=true;
            io.emit('begin');
        }}
    });






    //gérer les connexions

    socket.on('username',function(user) {
        if (connected_users.length < 2){
            if (game_on===undefined || game_on===true){
                buts_init();
                balle_m();
                clearInterval(repeat);
                console.log('la repeat a été cleared')
                clearInterval(clock);
                console.log('la clock a été cleared')
                console.log(score);
                game_on=false;
                readymetre=[];
                give_victoire(connected_users[0].name);
                socket.broadcast.emit('Wforfait')
            }
            connected_users.push({name:user,num:socket.id});
            io.emit('connected_users',connected_users);
            socket.emit('too much connexions',false);
        }else{
            socket.emit('too much connexions',true);
        }
        if (users.includes(user)) {socket.emit('already_known',true);
            console.log(user+' est déjà inscrit');
        } else
        {   socket.emit('already_known',false);
            users.push(user);
            console.log(user+' a été ajouté aux users')
            console.log('users :'+users);
        }
        io.emit('users',users);
        console.log('connected users'+JSON.stringify(connected_users));
    });

    //deconnexion d'un des joueurs
    socket.on('disconnect',function(){
        console.log('un user déconnecté');
       readymetre=[];
        connected_users=[];
            io.emit('you there ?');

    });
    socket.on('present',function(user){
        connected_users.push({name:user,num:socket.id});
        if (connected_users.length===2){}else{
        setTimeout(function(){
            if (connected_users.length===1 && game_on){
                buts_init();
                balle_m();
                clearInterval(repeat);
                console.log('la repeat a été cleared')
                clearInterval(clock);
                console.log('la clock a été cleared')
                console.log(score);
                game_on=false;
                readymetre=[];
                give_victoire(connected_users[0].name);
                socket.emit('Wforfait')
                readymetre=[];}
            io.emit('connected_users',connected_users);
                console.log('connected users'+JSON.stringify(connected_users))
        },200)
        }
    });

    socket.on('still ready',function(){
        readymetre.push(socket.id)
        setTimeout(function(){
            if (readymetre.length===1){io.emit('connected_users',connected_users)
                console.log('connected users'+JSON.stringify(connected_users))}
        },200)
    });

    socket.on('not ready',function(){
        if (socket.id===readymetre[0]){
            if (readymetre.length===2){readymetre.splice(0,1)}else{readymetre=[]}
        }else{
            readymetre.splice(1,1)
        }
    });









    //gestion chat
    socket.on('message',function(data){
        if (messages_reload.chateurs===[]){
            messages_reload.chateurs=connected_users};
        messages_reload.chats.push(data);
        socket.broadcast.emit('message',data)
        console.log('le serveur a broadcast le message :'+JSON.stringify(data) );
    });
    socket.on('reload messages',function(){
        socket.emit('messages_reloaded',messages_reload)
    });



});


function update(){
    io.volatile.emit('move_balle', [{'balle_x': balle_x, 'balle_y': balle_y, 'balle_r': balle_r},buts]);
}

//var clock = setInterval(update, 1000/60);

function give_victoire(user){
    var b = true;
    for (var p = 0; p < victoires.length; p++) {
        if (victoires[p].name === user) {
            victoires[p].wins += 1;
            b = false
        }
    };
    if (b) {
        victoires.push({name: user, wins: 1});
    }
    io.emit('victoires',victoires);
}


//position et orientation initale de la balle
const W = 1050;
const H = 680;
const balle_r = 15;
const balle_couleur = "yellow";
const but_w = 20;
const but_h = 110;
const but_couleur = "white";
var d1 = 40 ;
var d2 = W-d1-but_w;
balle_vitesse = 5;
balle_x = W/2;
balle_y = H/2;
balle_angle = 0;
balle_deviation = 0;
var rand=Math.floor(2*Math.random());
balle_direction = 2*rand-1;
//initialisation des buts
y1 = (H-but_h)/2;
y2 = (H-but_h)/2;
buts = [{d:d1,y:y1},{d:d2,y:y2}];










http.listen(8080, function(){

    console.log('listening on *:8080');



});