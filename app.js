const express=require("express");
const axios=require("axios");
var cheerio=require('cheerio');
const fs = require('fs');
const delay=require("delay");
const app=express();
const http=require("http");
const db=require('mysql');
const { next } = require("cheerio/lib/api/traversing");
const { ServerlessApplicationRepository } = require("aws-sdk");
const uuidAPIKey=require("uuid-apikey");

const dbconfig={
    host:"ec2-34-225-159-178.compute-1.amazonaws.com",
    user:"devtfeqqhtrezm",
    password:"32de3512febd822c30c936c0d59dbe951be3b45f8ce9f7ddf359d082ef96e19e",
    port:5432,
    ssl:{
        rejectUnauthorized:false
    }
}


const client=new pg.client(dbconfig);
client.connect();

const conn=db.createConnection({
    host:'localhost',
    port:3309,
    user:'root',
    password:'mariadb',
    database:'haksik_db'
});

const key={
    apikey: 'CPB5QJ3-9RN4SXB-G2MPDV9-MZ7MAST',
    uuid: '65965bc8-4e2a-4cf5-80a9-66eda7cf4567'
}
async function getHTML(){
    try{
        return await axios.get('https://www.ysc.ac.kr/kor/CMS/DietMenuMgr/list.do?mCode=MN148&searchDietCategory=1')
    }catch(error){
        console.error(error);
    }
}

app.get('/get/haksik_data',(req,res,next)=>{// 웹 크롤
    const tDir = __dirname + '/data';
    var today = new Date();
    var apikey=req.query.apikey;
    var year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2);
    var day = ('0' + today.getDate()).slice(-2);
    if(!uuidAPIKey.isAPIKey(apikey) ||!uuidAPIKey.check(apikey, key.uuid)){
        res.send('API KEY가 유효하지 않습니다.');
        
    }else{
        if(today.getDay()!=0){ //일요일 기준 파일 생성
            day=day-(today.getDay()+"");
        }

        var dateString = year + '-' + month  + '-' + day;

        fs.readFile(`./data/${dateString}.json`, 'UTF-8', (err, data) => {
            if (err) {
                if (err.code == "ENOENT") {
                    console.log("Error: ENOENT: no such file or directory, open " + err.path);
                    getHTML()
                    .then((html)=>{
                        let titleList=[];
                        const $=cheerio.load(html.data);
                        const boblist=$("div.is-wauto-box").children('table').children('tbody').children('tr')
                        var bobs=[];
                        var bobfinal=[];
                        boblist.each(function(i,elem){
                            titleList[i]={
                                bob:$(this).find("td").text().trim().replaceAll("\n","<br>")
                            };
                            bobs[i]=titleList[i].bob.split("<br>");
                        });
                        return bobs;
                    })
                    .then((dd)=>{
                        /*
                        fs.writeFile(`./data/${dateString}.json`,JSON.stringify(dd),(err)=>{
                            if(err)
                                console.log("!!!!!!!!!!!!!ERROR!!!!!!!!!!"+err);
                            const dataBuffer=fs.readFileSync(`./data/${dateString}.json`);
                            const dataJSON=dataBuffer.toString().replaceAll(/\\/gi,"");
                            //console.log(dataJSON);
                            res.send(dataJSON);
                            next();
                        });
                        */
                        fs.writeFileSync(`./data/${dateString}.json`,JSON.stringify(dd));
                        res.redirect('/get/haksik_data');
                    });
                }
                else {
                    console.log(err);
                }
            }
            else {
                const dataBuffer=fs.readFileSync(`./data/${dateString}.json`);
                const dataJSON=dataBuffer.toString().replaceAll(/\\/gi,"");
                //console.log(dataJSON);
                res.send(dataJSON);    
            }
        });

        
    }
});
app.get("/rate",(req,res)=>{
    var apikey=req.query.apikey;
    if(!uuidAPIKey.isAPIKey(apikey) ||!uuidAPIKey.check(apikey, key.uuid)){
        res.send('API KEY가 유효하지 않습니다.');
        
    }else{
        var q=`SELECT * FROM haksik WHERE content_name IN (${req.query.content});`
        /*
        conn.query(q,function(err,results,fields){
            if(err){
                console.log(err);
            }
            res.send(results);
        })
        */
       client.query(q,(err,res)=>{
        if(err){
            console.log(err);
        }else{
            res.send(results);
        }
       })
    }
})
app.post("/rate",(req,res)=>{
    var apikey=req.query.apikey;
    if(!uuidAPIKey.isAPIKey(apikey) ||!uuidAPIKey.check(apikey, key.uuid)){
        res.send('API KEY가 유효하지 않습니다.');
        
    }else{
        var q=`INSERT INTO haksik VALUES (${req.query.menu}, 1) ON DUPLICATE KEY UPDATE total_star=total_star+1;`;
        /*
        conn.query(q,function(err,lastresult,fields){
            var query=`INSERT INTO log(uid,content_name,datetime) VALUES (${req.query.uid},${req.query.menu},now());`;
            conn.query(query,function(err,results,fields){
                if(err){
                    console.log(err);
                    res.sendStatus(500);
                }
                res.sendStatus(200);
            })
        })
        */
       client.query(q,(err,res)=>{
        var query=`INSERT INTO log(uid,content_name,datetime) VALUES (${req.query.uid},${req.query.menu},now());`;
        client.query(query,function(err,results,fields){
            if(err){
                console.log(err);
                res.sendStatus(500);
            }
            res.sendStatus(200);
        })
       })
    }
});
//git
app.get("/",(req,res)=>{
    res.send("Hi");
    
})

http.createServer(app).listen(process.env.PORT||3000);