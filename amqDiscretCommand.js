// Universal Command Handler for Tampermonkey Scripts
(function() {
    'use strict';

    // Global command registry
    window.CommandRegistry = window.CommandRegistry || {
        commands: {},
        
        // Method to register a new command
        register: function(command, handler) {
            this.commands[command] = handler;
        },
        
        // Method to handle command execution
        execute: function(fullCommand) {
            // Split the command into command name and arguments
            const parts = fullCommand.trim().split(/\s+/);
            const commandName = parts[0];
            const args = parts.slice(1).join(' ');
            
            // Check if the command exists
            if (this.commands.hasOwnProperty(commandName)) {
                try {
                    // Execute the command handler
                    const result = this.commands[commandName](args);
                    return {
                        handled: true,
                        command: commandName,
                        args: args,
                        result: result
                    };
                } catch (error) {
                    console.error(`Error executing command ${commandName}:`, error);
                    return {
                        handled: false,
                        error: error.message
                    };
                }
            }
            
            return { handled: false };
        }
    };

    // Universal command interceptor function
    function universalCommandInterceptor(event) {
        // Check if the pressed key is Enter
        if (event.keyCode === 13) {
            const inputElement = event.target;
            const inputValue = inputElement.value.trim();
            
            // Check if the input starts with a command prefix
            if (inputValue.startsWith('/')) {
                const commandResult = window.CommandRegistry.execute(inputValue);
                
                if (commandResult.handled) {
                    // Prevent the message from being sent
                    event.preventDefault();
                    
                    // Clear the input
                    inputElement.value = '';
                    
                    // Optional: Display command result or log it
                    // console.log('Command executed:', commandResult);
                    
                    // You can add custom logging or notification here
                    // For example, using an existing system message function if available
                    if (typeof gameChat !== 'undefined' && gameChat.systemMessage) {
                        gameChat.systemMessage(`Command ${commandResult.command} executed.`);
                    }
                }
            }
        }
    }

    // Add the event listener to detect commands
    document.addEventListener('keydown', universalCommandInterceptor);

    // Example of registering commands (you can do this in your specific script)
    window.CommandRegistry.register('/example', (args) => {
        console.log('Example command called with args:', args);
        return `Processed example with: ${args}`;
    });

    // Expose the CommandRegistry globally for easy access
    window.commandRegistry = window.CommandRegistry;
})();

// Usage in your specific Tampermonkey script:
// 1. Include this script with @require
// 2. Add commands like this:
// window.CommandRegistry.register('/mycommand', (args) => {
//     // Your command logic here
//     return 'Command result';
// });
