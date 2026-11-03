# SourceQ Project Workflow
- Add a new source - Pipeline
- Query from source - Pipeline

## Steps to adding source pipeline
- User will click the source to add his pdf/docs file ✅
- Take the source and add in to the IndexQueue, job queue ✅
- Worker will pick job start indexing ✅
- Till the source is indexing show yellow blink to user

## Steps to start query
- User will query to source
- Pick query and create step Back prompt,Sub Query, Rewrite, HyDE 
- Take all prompt than do query from S3 
- rank all the result using ranking algorithm/library and take top 5 
- use that top 3 result and userQuery feed it to llm and generate response


## Making Universal loader
- Create a universal loader which will load document and return langchain documents for all source 
- rewrite the indexer which will take document to index

## TODO
- create seprate api for taking website url,youtube url and text