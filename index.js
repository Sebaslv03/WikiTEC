const express = require('express')
const bodyParser = require('body-parser');
const mariadb = require('mariadb');
const app = express()
const path = require('path')
const methodOverride = require('method-override')
const port = 3000
var snowballFactory = require('snowball-stemmers');
var stemmer = snowballFactory.newStemmer('spanish');

const pool = mariadb.createPool({
  host: '127.0.0.1', 
  user:'dbuser', 
  password: '1234',
  port: '3305',
  database: 'wikitec',
  connectionLimit: 5
});

app.use(express.urlencoded({extended:true}))
const publicPath = path.join(__dirname, 'public')
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(methodOverride('_method'))
app.use(express.static(publicPath))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', (req, res) => {
  res.render('index.ejs', {urls : []});
});

app.post('/searchWord', async (req, res) => {
  let palabras = req.body.searchInput;
  let words = palabras.split(/\W+/);
  let conn;
  let rows;
  let result = [];
  try {
      conn = await pool.getConnection();
      for (const word of words) {
          let stemmed = stemmer.stem(word);
          rows = await conn.query("SELECT a.palabras, a.cant, b.porcentaje, c.porcentajetags, a.url FROM (SELECT palabras, url, cant FROM palabras WHERE palabras = ?) AS a, (SELECT url, porcentaje FROM palabrasporcentaje WHERE palabra = ?) AS b, (SELECT url, porcentajetags FROM palabrastags WHERE palabra = ?) AS c WHERE a.url = b.url && a.url = c.url && c.url = b.url;", [stemmed, stemmed, stemmed]);
          result.push(...rows);
      }
  } catch (error) {
      console.log(error);
  } finally {
      if (conn) conn.release(); //release to pool
  }
  res.render('index.ejs', { urls: result });
});

app.post('/infoUrl', async (req, res) => {
  const url = req.body.urlUnico
  try{
    conn = await pool.getConnection();
    rows = await conn.query("SELECT CantTitulos, CantPalabrasStemming, CantRefs, CantPalabrasStemmingTitulos, CantAlt, CantImgStem FROM urls where url = ?", [url])
    references = await conn.query("SELECT referencia, CantUsado, link FROM referencias WHERE url = ?", [url])
    comunes = await conn.query("SELECT palabra, cantAparece, inTitulo FROM palabrascomunes WHERE url = ? ORDER BY cantAparece desc", [url])
  } catch (error) {
    console.log(error)
  } finally {
    if (conn) conn.release();
  }
  comunesFinal = []
  if (comunes.length > 10)
    comunesFinal = comunes.slice(0, 10);
  else
    comunesFinal = comunes
  res.render('infoUrl.ejs', {info : rows[0], references : references, comunes: comunesFinal})
});




app.use(express.json());

app.listen(port, ()=>{
    console.log("port connected")
})










