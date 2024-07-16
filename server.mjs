import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient, GridFSBucket } from 'mongodb';
import gridfsStream from 'gridfs-stream';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongodb from 'mongodb'; // Ensure this is included
const { ObjectId } = mongodb;
import fetch from 'node-fetch'; // Add this import


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Add this to parse JSON bodies


console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('PORT:', process.env.PORT);
let gfs,gfsImage;
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Middleware to ensure MongoDB client is connected
app.use(async (req, res, next) => {
    console.log('Middleware execution started');
    try {
        const db = client.db('sample_hscode'); // Adjust as needed for different databases
        const topology = client.topology;
        
        if (topology && topology.isConnected()) {
            console.log('MongoDB already connected');
        } else {
            console.log('MongoDB not connected, connecting...');
            await client.connect();
            console.log('MongoDB connected');
        }
        
        req.db = db;
        // const bucket = new GridFSBucket(db);
        // gfs = gridfsStream(db, MongoClient);
        // gfs.collection('pdfs');
        gfsImage = gridfsStream(db, MongoClient);
        gfsImage.collection('extracted_images'); // Use the bucket name 'extracted_images'

        next();
    } catch (error) {
        console.error('MongoDB connection error:', error);
        res.status(500).send('Internal server error');
    }
});


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.get("/qa", (req, res) => {
  res.sendFile(__dirname + "/qa_index.html");
});
  
async function callFlaskAPI(endpoint, data) {
  const response = await fetch(`http://127.0.0.1:5000/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
  });
  const result = await response.json();
  return result;
}
app.post('/search', async (req, res) => {
  const queryText = req.body.searchInput;
  console.log(req.body)
  // const queryType = req.body.queryType; // "text" or "image"

  console.log('queryText')
  console.log(queryText)

  console.log('queryType')
  // console.log(queryType)
  try {
    await client.connect();
    console.log('going to search similar text')
    const queryEmbedding = await callFlaskAPI('embed', { text: queryText });

    const pipeline = [
      {
        "$vectorSearch": {
          "index": "PDFIndex",
          "path": "embedding",
          "queryVector": queryEmbedding,
          "numCandidates": 100,
          "limit": 20,
        }
      },
      {
        "$sort": { "score": -1 }
    },
      {
        "$project": {
          "_id": 1,
          "score": {"$meta": "vectorSearchScore"},
          "source": 1,
          "type": 1,
          "metadata": 1,
          "pdf_id":1,
          "extracted_text":1,
          "gridfs_file_id":1
        }
      }
    ];
  
    const collection = client.db('sample_hscode').collection('pdf_multimodal_embedding_version5');
    const results = await collection.aggregate(pipeline).toArray();
    console.log('result getting')
    console.log(results)
    // Group results by source
    const groupedResults = {};
    results.forEach(result => {
      const source = result.source;
      if (!groupedResults[source]) {
        groupedResults[source] = [];
      }
      groupedResults[source].push(result);
    });
  
    // return groupedResults;
   res.send(groupedResults);
    // res.json(groupedResults);
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

// Endpoint to serve PDF by filename
app.get('/pdf/:filename', async (req, res) => {
  const filename = req.params.filename;

  try {
      const db = client.db('sample_hscode');
      const bucket = new GridFSBucket(db, {
          bucketName: 'pdfs'
      });
// bucket.openDownloadStream(ObjectId("60edece5e06275bf0463aaf3")).
//      pipe(fs.createWriteStream('./outputFile'));
      const downloadStream = bucket.openDownloadStreamByName(filename);

      res.set('Content-Type', 'application/pdf');
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
          console.error('Error streaming PDF:', error);
          res.status(500).send('Error streaming PDF');
      });
  } catch (error) {
      console.error('Error retrieving PDF:', error);
      res.status(500).send('Error retrieving PDF');
  }
});
app.get('/image/:id', async (req, res) => {
  const imageId = req.params.id;

  try {
    await client.connect();
    const db = client.db('sample_hscode');
    const bucket = new GridFSBucket(db, {
      bucketName: 'extracted_images'
    });

    const downloadStream = bucket.openDownloadStream(ObjectId(imageId));

    res.set('Content-Type', 'image/jpeg'); // Set the appropriate content type for the image (e.g., image/png, image/jpeg)
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Error streaming image:', error);
      res.status(500).send('Error streaming image');
    });
  } catch (error) {
    console.error('Error retrieving image:', error);
    res.status(500).send('Error retrieving image');
  }
});
app.post('/qa', async (req, res) => {
  const { question } = req.body;

  try {
    // Generate embedding for the question
    const questionEmbedding = await callFlaskAPI('embed', { text: question });

    // Define the aggregation pipeline
    const pipeline = [
      {
        "$vectorSearch": {
          "index": "PDFIndex",
          "path": "embedding",
          "queryVector": questionEmbedding,
          "numCandidates": 100,
          "limit": 20
        }
      },
      {
        "$sort": { "score": -1 }
      },
      {
        "$project": {
          "_id": 1,
          "score": { "$meta": "vectorSearchScore" },
          "source": 1,
          "type": 1,
          "metadata": 1,
          "pdf_id": 1,
          "extracted_text": 1,
          "gridfs_file_id": 1
        }
      }
    ];

    // Connect to MongoDB and run the aggregation pipeline
    await client.connect();
    const collection = client.db('sample_hscode').collection('pdf_multimodal_embedding_version5');
    const results = await collection.aggregate(pipeline).toArray();
    // Debug: Print the aggregated results to verify the content
    // console.log('Aggregated Results:', results);

    // Extract the relevant text from the top results
    const topResults = results.slice(0, 5).map(doc => doc.extracted_text).join(" ");

    // Debug: Print the concatenated top results
    console.log('Concatenated Top Results:', topResults);
    
    // Get the answer to the question using the extracted text as context
    const answer = await callFlaskAPI('qa', { question, context: topResults });

    console.log('answer')
    console.log(answer)
    // Return the answer in the response
    res.json(answer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
});
  
app.listen(process.env.PORT, function () {
    console.log("server is running on port " + process.env.PORT);
});

// Call createEmbeddings function to create embeddings
// createEmbeddings();
