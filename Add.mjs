import * as fs from 'node:fs';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Read the HTML template
const html = fs.readFileSync('index.html', { encoding: 'utf8' });

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient();
const dynamo = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
    const queryParams = event.queryStringParameters;

    if (queryParams) {

        const recipeId = queryParams.recipe_id || `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

        // Process Tags
        const tags = [];
        if (Array.isArray(queryParams.Tags)) {
            tags.push(...queryParams.Tags);
        } else if (queryParams.Tags) {
            tags.push(queryParams.Tags); // Single checkbox selected
        }

        // Save data to DynamoDB
        await dynamo.send(new PutCommand({
            TableName: "RecipeTable",
            Item: {
                recipe_id: recipeId,
                sk: event.requestContext.requestId,
                Name: queryParams.Name,
                Description: queryParams.Description,
                Ingredients: queryParams.Ingredients,
                Instructions: queryParams.Instructions,
                Tags: tags,
                Image: queryParams.Image, // Assuming a pre-signed URL or similar is used
            }
        }));
    }

    // Generate dynamic HTML with form results
    let modifiedHTML = dynamicForm(html, queryParams);

    // Query DynamoDB for entries
    const RecipeID = queryParams?.recipe_id || "data";
    const params = {
        TableName: "RecipeTable",
        KeyConditionExpression: "recipe_id = :recipe_id",
        ExpressionAttributeValues: {
            ":recipe_id": RecipeID
        }
    };

    const tableQuery = await dynamo.send(new QueryCommand(params));

    // Add results to the table
    modifiedHTML = dynamictable(modifiedHTML, tableQuery, RecipeID);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: modifiedHTML,
    };
};

function dynamicForm(html, queryStringParameters) {
    const formRes = queryStringParameters
        ? Object.entries(queryStringParameters)
              .map(([key, val]) => `${key}: ${val}`)
              .join(", ")
        : "No form data submitted.";
    return html.replace('{formResults}', `<h4>Submitted Data</h4><p>${formRes}</p>`);
}

function dynamictable(html, tableQuery, RecipeID) {
    let table = "<p>No records found for this RecipeID.</p>";
    if (tableQuery.Items && tableQuery.Items.length > 0) {
        const tableContent = tableQuery.Items.map(item => {
            const attributes = Object.entries(item)
                .map(([key, val]) => `<tr><td>${key}</td><td>${val}</td></tr>`)
                .join("");
            return `<table>${attributes}</table>`;
        }).join("");
        table = `<h4>Entries for RecipeID ${RecipeID}</h4>${tableContent}`;
    }
    return html.replace("{table}", table);
}