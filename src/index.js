
var graphql = require('graphql');

var parse = require('./parser');
var createTypeGenerator = require('./create-type-generator');
var typeGenerator = createTypeGenerator(graphql);

function createQueryFn(source, implementation) {
  let {objectTypes} = typeGenerator(parse(source), implementation);
  var schema = new graphql.GraphQLSchema({
    query: objectTypes['Query']
  });
  return (query, context) => graphql.graphql(schema, query, context);
}
createQueryFn.parse = parse;
createQueryFn.createTypeGenerator = createTypeGenerator;
createQueryFn.typeGenerator = typeGenerator;
module.exports = createQueryFn;
