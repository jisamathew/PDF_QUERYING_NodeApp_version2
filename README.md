Node.js Semantic Search and Q&A Application

Overview
This Node.js application offers two main features:
1. Semantic Search on Uploaded PDFs: Enables users to search through PDF documents using advanced semantic search capabilities.

2. Question and Answer Functionality: Provides answers to user questions based on the content of the uploaded PDFs.

How It Works

Semantic Search
PDF Extraction and Embedding:
The application uses Python to extract text from uploaded PDF documents.
It then generates embeddings (numeric representations) of the extracted text using the OpenAI CLIP model(openai/clip-vit-large-patch14).
Storage and Search:
These embeddings are stored in a MongoDB Atlas database.
For searching, the application uses MongoDB Atlas's vector search functionality to perform semantic searches on the embeddings.

Question and Answer
Q&A Model(deepset/roberta-base-squad2):
The application leverages Q&A model to generate answers.
When a user asks a question, the model uses the stored embeddings to find relevant content in the PDFs and provides an answer.

Technologies Used
Node.js: The main runtime environment for the application.
Python: Used for extracting text from PDFs and generating embeddings.
OpenAI CLIP Model(openai/clip-vit-large-patch14): For creating embeddings from the PDF content.
MongoDB Atlas: To store the embeddings and perform vector searches.
Q&A Model(deepset/roberta-base-squad2): To generate answers to user questions based on PDF content.

Setup and Installation
Clone the Repository:
    git clone <repository-url>
    cd <repository-directory>


Install Node.js Dependencies:
    npm install


Configure Environment Variables:
Set up your MongoDB Atlas credentials.
Configure your OpenAI API keys.

Run the Application:

    npm start


Usage
Upload PDFs: Users can upload PDF documents to the application.
Semantic Search: Users can perform searches on the uploaded PDFs using natural language queries.
Ask Questions: Users can ask questions related to the content of the uploaded PDFs and get precise answers.


On live deployment for running python script do folowing step:
Here’s a step-by-step guide assuming you are using Render for deployment:

1. Create a requirements.txt file:
    transformers

2. Update your Render build and start scripts:

In the Render dashboard, go to your service settings and configure the build and start commands to include installing Python dependencies.

For example:
Build Command: pip install -r requirements.txt && npm install
Start Command: npm start

3. Redeploy your application:

After making these changes, redeploy your application on Render. This should ensure that the transformers module is installed in the Python environment used by your script.