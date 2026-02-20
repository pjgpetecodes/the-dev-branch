# Contributing to The Dev Branch

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment details

### Suggesting Features

Feature requests are welcome! Please:
- Check existing issues first
- Describe the feature clearly
- Explain why it would be useful
- Consider implementation complexity

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**
   ```bash
   cd TheDevBranch
   dotnet build
   dotnet run
   ```

5. **Commit with clear messages**
   ```bash
   git commit -m "Add feature: description"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style Guidelines

### C# Code
- Follow Microsoft C# coding conventions
- Use meaningful variable names
- Add XML documentation comments for public methods
- Keep methods focused and concise

### JavaScript Code
- Use ES6+ features
- Use async/await for asynchronous operations
- Add comments for complex logic
- Follow existing naming conventions

### HTML/CSS
- Use semantic HTML
- Keep CSS organized and commented
- Ensure responsive design
- Test on multiple browsers

## Project Structure

```
TheDevBranch/
├── Hubs/              # SignalR hubs
├── Models/            # Data models
├── Services/          # Business logic
├── Pages/             # Razor pages
└── wwwroot/
    ├── css/           # Stylesheets
    ├── js/            # JavaScript files
    └── lib/           # Third-party libraries
```

## Adding New Cards

To add new cards to the game:

1. **Black Cards**: Edit `black-cards.txt`
   - One card per line
   - Use underscores (\_) for blanks where players fill in answers
   - Example: `The best part of coding? _____.`

2. **White Cards**: Edit `white-cards.txt`
   - One card per line
   - Keep them funny and developer-themed
   - Example: `A 10x developer`

## Testing Checklist

Before submitting a PR, ensure:
- [ ] Code builds without errors
- [ ] Application runs locally
- [ ] Multiplayer functionality works (test with multiple browser tabs)
- [ ] No console errors
- [ ] UI is responsive
- [ ] Security best practices followed

## Areas for Contribution

Here are some areas where contributions are especially welcome:

### Easy
- Adding more cards (always welcome!)
- Improving UI/UX design
- Documentation improvements
- Bug fixes

### Medium
- Adding sound effects
- Implementing chat functionality
- Adding game statistics/leaderboard
- Custom room settings (card count, win score, etc.)

### Advanced
- Persistent storage (database integration)
- User authentication
- Custom card deck management
- Mobile app versions
- Internationalization/localization

## Security

If you discover a security vulnerability:
- **DO NOT** open a public issue
- Email the maintainers directly
- Allow time for the issue to be fixed before public disclosure

## Questions?

- Check existing issues and documentation
- Create a new issue for questions
- Tag with "question" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Be respectful and inclusive. We want this to be a welcoming community for everyone.

Thank you for contributing! 🎮


