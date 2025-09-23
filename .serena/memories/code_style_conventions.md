# Code Style and Conventions

## General Principles
- **KISS (Keep It Simple, Stupid)**: Simple solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Implement only what's needed
- **API-First Architecture**: HubSpot and external APIs are the backend
- **Stateless by Design**: Every Vercel function execution is independent
- **Async by Default**: Use async/await for all API calls

## JavaScript/Node.js Style
- **ES6+ Syntax**: Use modern JavaScript features
- **Async/Await**: Preferred over Promises and callbacks
- **Error-First**: Handle errors as first parameter in callbacks
- **Joi Validation**: All inputs must be validated
- **Destructuring**: Use object/array destructuring where appropriate

## File Organization
- **Shared Utilities**: Place in `_shared/` directory
- **Single Responsibility**: Each file/function has one clear purpose
- **Explicit Exports**: Use module.exports for Node.js, named exports for React
- **Environment Variables**: Never hardcode secrets

## React Conventions
- **Functional Components**: Use hooks instead of class components
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Component Structure**: Props validation, component logic, JSX return
- **Event Handlers**: Prefix with `handle` (e.g., `handleSubmit`)

## API Design
- **RESTful Endpoints**: Follow REST conventions
- **Status Codes**: Use appropriate HTTP status codes
- **Error Responses**: Consistent error format with message and code
- **Input Validation**: Validate all inputs with Joi schemas

## Security Guidelines
- **Input Sanitization**: Sanitize all user inputs
- **Token Validation**: Always validate access tokens
- **Rate Limiting**: Implement for all public endpoints
- **CORS Configuration**: Proper CORS headers for cross-origin requests