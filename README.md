# Seletor de Soluções Dinâmico (Dynamic Solution Selector)

This project is a single-page web application designed to help users filter, compare, and manage a list of services or "solutions" such as schools, gyms, and language courses. It provides a user-friendly interface to dynamically update the view based on various criteria.

## Features

- **Dynamic Filtering:** Filter solutions by Category, Region, and Price Range.
- **Search Functionality:** Search for specific solutions by name. The search simulates an asynchronous API call to demonstrate loading states.
- **Solution Comparison:** Select up to three solutions to view their key details in a side-by-side comparison table.
- **Add New Categories:** Dynamically add new categories to the filter options.
- **Load from URL:** Simulate loading a new solution from a predefined URL.
- **Remove Solutions:** Remove solutions from the list.
- **Favorites:** Mark solutions as favorites within the comparison view.
- **Responsive Design:** A mobile-first design with a collapsible sidebar for filters on smaller screens.

## How to Use

Since this is a self-contained project with no external dependencies, you can run it by simply opening the `index.htm` file in your web browser.

1.  Clone or download the repository.
2.  Navigate to the project directory.
3.  Open `index.htm` in a modern web browser like Chrome, Firefox, or Edge.

## Technical Stack

- **HTML5:** For the basic structure of the application.
- **Tailwind CSS:** For styling the user interface. The utility classes are loaded via a CDN.
- **JavaScript (ES6):** For all the client-side logic, including filtering, searching, and DOM manipulation. No external libraries or frameworks are used.

## Project Structure

For simplicity and demonstration purposes, the entire application—including HTML, CSS (via CDN), and JavaScript—is contained within the `index.htm` file.

- The `<head>` section includes the Tailwind CSS CDN link and custom CSS styles.
- The `<body>` contains the HTML structure for the header, sidebar, main content, and comparison section.
- The `<script>` tag at theend of the body contains all the JavaScript logic and the hardcoded data for the solutions.

## Future Improvements

The current implementation uses hardcoded data for demonstration. Future enhancements could include:

- **Backend Integration:** Replace the hardcoded `allSolutions` array and simulated API calls with actual requests to a backend server and database.
- **Persistent Storage:** Use `localStorage` or a backend to save user-added categories, favorited items, and loaded solutions.
- **Component-Based Framework:** Refactor the code using a modern JavaScript framework like React, Vue, or Svelte for better state management and component organization.
