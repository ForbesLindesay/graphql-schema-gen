import createTypeGenerator from './create-type-generator';

export default function createSchemaGenerator(graphql) {
  var typeGenerator = createTypeGenerator(graphql);
  return function (document, implementation) {
    var {objectTypes} = typeGenerator(document, implementation);
    return new GraphQLSchema({
      query: objectTypes['Query']
    });
  };
};
