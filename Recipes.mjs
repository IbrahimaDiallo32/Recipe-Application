import * as fs from 'node:fs';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Read the HTML template
const indexHtml = fs.readFileSync('index.html', { encoding: 'utf8' });

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient();
const dynamo = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async () => {
    console.log("Lambda function triggered");

    try {
        // Scan DynamoDB to get all recipes
        const params = {
            TableName: "RecipeTable",
        };

        const data = await dynamo.send(new ScanCommand(params)); // Scan DynamoDB for all items
        console.log('Data from DynamoDB:', data.Items);

        // Generate recipe cards HTML from all the data
        const recipeCards = generateRecipeCards(data.Items || []);
        console.log('Generated recipe cards:', recipeCards);

        // Replace placeholder with actual recipe cards
        const modifiedHTML = indexHtml.replace("{recipeCards}", recipeCards);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: modifiedHTML,
        };
    } catch (error) {
        console.error('Error occurred:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error.message,
                stack: error.stack,
            }),
        };
    }
};

// Function to generate recipe cards HTML from the data
function generateRecipeCards(items) {
    return items.map(item => {
        // Extract tags properly, assuming Tags is a list of strings
        const tags = item.Tags && item.Tags.length > 0
            ? item.Tags.join(", ") // Directly join the list of tags into a string
            : "No Tags";  // Default text if no tags

        // Generate the HTML for each card
        return `
        <div class="col">
            <div class="card">
                <img src="${item.Image || 'https://via.placeholder.com/150'}" class="card-img-top" alt="${item.Name || 'Recipe Image'}" />
                <div class="card-body">
                    <h5 class="card-title">${item.Name || 'Untitled Recipe'}</h5>
                    <p class="card-text">${item.Description || 'No Description'}</p>
                    <p class="card-text">${item.Ingredients || 'No Ingredients'}</p>
                    <p class="card-text">${item.Instructions || 'No Instructions'}</p>
                    <p class="card-text"><strong>Tags:</strong> ${tags}</p>
                </div>
            </div>
        </div>
    `;
    }).join("");
}
