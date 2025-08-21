# Game Promotion API

A NestJS API for managing game promotions with MongoDB.

## Description

This API provides CRUD operations for managing game promotions in a minigame database. It follows clean code principles and a modular architecture.

## Features

- Create, read, update, and delete promotions
- Advanced promotion filtering (by operator, status, code)
- Bet levels and coin values configuration for promotions
- Health check endpoint
- MongoDB integration via Mongoose
- Input validation using class-validator
- Environment variable configuration
- Swagger API documentation
- Code formatting with Prettier
- Linting with ESLint
- Git hooks for code quality enforcement

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/minigame
```

## Running the app

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## Code Quality

The project uses ESLint and Prettier for code quality and formatting.

```bash
# Format code
npm run format

# Lint code
npm run lint

# Check code formatting without modifying files
npm run format:check

# Check linting without fixing issues
npm run lint:check
```

### Git Hooks

This project uses Husky and lint-staged to enforce code quality on each commit:

- **pre-commit**: Runs Prettier and ESLint on staged files before allowing a commit

These hooks are installed automatically when you run `npm install`.

## API Documentation

The API includes Swagger documentation, which can be accessed at:

```
http://localhost:3000/api
```

This interactive UI allows you to:

- View all available endpoints
- See request/response schemas
- Test API endpoints directly from the browser

## Documentation

### API Endpoints Documentation

- **[Promotion API](diagrams/api-endpoints/PromotionAPI.md)** - Core promotion management endpoints
- **[Turnover Tracking APIs](diagrams/api-endpoints/TurnoverTrackingAPIs.md)** - Turnover tracking and bonus win claim APIs

### Sequence Diagrams

- **[Turnover Tracking Flow](diagrams/sequence/TurnoverTrackingFlow.md)** - Complete flow of turnover tracking system

### Architecture Diagrams

- **[Data Models](diagrams/data-models/)** - Database schemas and data models
- **[Architecture](diagrams/architecture/)** - System architecture diagrams
- **[Deployment](diagrams/deployment/)** - Deployment and infrastructure diagrams

## API Endpoints

### Health Check

- `GET /`: Check if the API is running

### Promotions

- `GET /promotions`: Get promotions with multiple filter options:
  - `operatorIds`: Filter by one or more operator IDs (comma-separated or repeated parameter)
  - `status`: Filter by promotion status (`not_started`, `running`, `ended`)
  - `code`: Filter by exact promotion code match
- `GET /promotions/:id`: Get promotion by ID
- `POST /promotions`: Create a new promotion
- `PUT /promotions/:id`: Update a promotion
- `DELETE /promotions/:id`: Delete a promotion
- `GET /promotions/admin/test`: Test endpoint

### Promotion Status Filtering

Promotions can be filtered by their current status:

- **not_started**: Promotions where the start date is in the future
- **running**: Promotions where the current date is between start and end dates
- **ended**: Promotions where the end date is in the past

Example: `GET /promotions?status=running&operatorIds=op123,op456&code=summer-promo`

## Promotion Configuration

### Bet Levels and Coin Values

Promotions can be configured with both bet levels and coin values to support different currency configurations:

#### Bet Levels (ClassicSlot)
- **Purpose**: Define bet amounts for different currency groups in ClassicSlot games
- **Game Type**: Used with `gameConfigType: 2` (ClassicSlot)
- **Structure**: Array of objects with `currencyGroup` (ObjectId) and `betLevel` (Number)
- **Optional**: Can be omitted if not needed
- **Example**:
```json
{
  "gameConfigType": 2,
  "betLevels": [
    {
      "currencyGroup": "60d21b4667d0d01ce67a7e3b",
      "betLevel": 0.2
    }
  ]
}
```

#### Coin Values (CascadingSlot)
- **Purpose**: Define coin values for different currency groups in CascadingSlot games
- **Game Type**: Used with `gameConfigType: 3` (CascadingSlot)
- **Structure**: Array of objects with `currencyGroup` (ObjectId) and `coinValue` (Number)
- **Optional**: Can be omitted if not needed
- **Example**:
```json
{
  "gameConfigType": 3,
  "coinValues": [
    {
      "currencyGroup": "60d21b4667d0d01ce67a7e3b",
      "coinValue": 0.2
    }
  ]
}
```

### Game Configuration Types
- **ClassicSlot** (2): Traditional slot game configuration - uses bet levels
- **CascadingSlot** (3): Cascading slot game configuration - uses coin values

### Gift Code Support
- **isGiftCode**: Boolean flag to indicate if the promotion is a gift code
- **minTurnoverMultiplier**: Minimum turnover multiplier required (default: 2X)

## Collections

The API uses the following MongoDB collections:

### game_promotions

```javascript
{
    name: String,                     // PromotionName
    code: String,                     // PromotionCode (derived from name)
    operatorId: String,               // Operator identifier
    offeredSiteNames: [String],       // Array of site identifiers, empty means offer all
    currencyGroups: [ObjectId],       // Array of currency groups, not allowed to be empty
    startDate: Date,                  // Start date and time
    endDate: Date,                    // End date and time
    claimExpirationDate: Date,        // Date when bonus items become unclaimable
    bonusItemCount: Number,           // Number of free spins per player
    offeredPlayerIds: [String],       // List of eligible player IDs, empty means all
    gameConfigType: Number,           // 2: "ClassicSlot" | 3: "CascadingSlot"
    gameIds: [Number],                // List of eligible games, not null
    betLevels: [{                     // List of bet levels for this promotion (optional)
        currencyGroup: ObjectId,
        betLevel: Number
    }],
    coinValues: [{                    // List of coin values for this promotion (optional)
        currencyGroup: ObjectId,
        coinValue: Number
    }],
    isGiftCode: Boolean,              // Indicates if this promotion is a gift code
    minTurnoverMultiplier: Number     // Minimum TO multiplier required (at least 2X)
}
```

### game_player_promotions

```javascript
{
    playerId: String,                // Player identifier
    operatorId: String,              // Operator identifier
    siteName: String,                // Site identifier
    promotionId: ObjectId,           // Reference to game_promotions collection
    promotionCode: String,           // Promotion code for quick reference
    currencyGroup: ObjectId,         // Currency group ObjectId
    remainingBonusItems: Number,     // Number of remaining bonus items (0 means completed)
    lastUsedDate: Date,              // Last time the promotion was used
    createdAt: Date,                 // Creation timestamp
    updatedAt: Date                  // Last update timestamp
}
```

## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/ee/gitlab-basics/add-file.html#add-a-file-using-the-command-line) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://git3.nexdev.net/l1/backend-services/game-promotion-api.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://git3.nexdev.net/l1/backend-services/game-promotion-api/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/ee/user/project/merge_requests/merge_when_pipeline_succeeds.html)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/index.html)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

---

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name

Choose a self-explaining name for your project.

## Description

Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges

On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals

Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation

Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage

Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support

Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap

If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing

State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment

Show your appreciation to those who have contributed to the project.

## License

For open source projects, say how it is licensed.

## Project status

If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.

## Error Codes System

This project uses a standardized error code system for consistent API responses across all modules.

### Error Code Format

```
{MODULE}{CATEGORY}{NUMBER}
```

### Modules

- **SB**: Spin Bonus (Player Promotion operations)
- **PR**: Promotion management
- **AN**: Announcement operations

### Categories

- **30XX**: Player Promotion operations
- **31XX**: Promotion management
- **32XX**: Announcement operations

### Current Error Codes

#### Player Promotion (SB30XX)

- `SB3000`: Player promotion not found
- `SB3001`: Cannot deduct bonus item
- `SB3002`: Bonus item deducted successfully

#### Promotion (PR31XX)

- `PR3100`: Promotion not found
- `PR3101`: Promotion has expired
- `PR3102`: Promotion is not active

#### Announcement (AN32XX)

- `AN3200`: Announcement not found
- `AN3201`: Announcement has expired

### Usage

```typescript
import { PLAYER_PROMOTION_ERROR_CODES } from '../constants/error-codes';

// Using destructuring for clean code
return {
  success: false,
  ...PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND,
};
```

### Response Format

All API responses follow this standardized format:

```json
{
  "success": boolean,
  "code": "string",
  "message": "string"
}
```
