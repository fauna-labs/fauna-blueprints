#### Blueprint template

a template in case you want to contribute some Fauna resources to the repository.
- Copy the blueprint-template folder to a new folder in the community folder
- Change the package.json name/description/author, keep the minimum library configuration.
- Run npm install to install eslint plugins and test libraries such as AVA. Use your favorite eslint editor plugin to enforce the rules.
- Add the resources you want to share in the 'fauna' folder
- Write tests in the 'tests' folder which verify that the resources behave well.
- To run tests, provide an Fauna admin key in .env.test (a .env.test.example file was provided to copy and rename), run ```npm test``` to run your tests.