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


const conn=db.createConnection({
    host:'ysc-haksik-db.cbz9hhawtadk.us-west-2.rds.amazonaws.com',
    port:3306,
    user:'admin',
    password:'songdamhaksik',
    database:'haksik_rate'
});
async function getHTML(){
    try{
        return await axios.get('https://www.ysc.ac.kr/kor/CMS/DietMenuMgr/list.do?mCode=MN148&searchDietCategory=1')
    }catch(error){
        console.error(error);
    }
}

app.get('/get/haksik_data',(req,res)=>{// 웹 크롤
    const tDir = __dirname + '/data';
    var today = new Date();

    var year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2);
    var day = ('0' + today.getDate()).slice(-2);

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

    
    
});
app.get("/rate",(req,res)=>{
    var q=`INSERT INTO haksik VALUES (${req.query.menu}, 1) ON DUPLICATE KEY UPDATE total_star=total_star+1;`;
    conn.query(q,function(err,lastresult,fields){
        var query=`INSERT INTO log(uid,content_name,datetime) VALUES (${req.query.uid},${req.query.menu},now());`;
        conn.query(query,function(err,results,fields){
            if(err){
                console.log(err);
            }
            res.sendStatus(200);
        })
    })
});
app.get("/",(req,res)=>{
    res.send("Hi");
    console.log(uuidAPIKey.create());
})

http.createServer(app).listen(process.env.PORT||3000);