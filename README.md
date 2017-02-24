# graphql-schema-gen

[![Greenkeeper badge](https://badges.greenkeeper.io/ForbesLindesay/graphql-schema-gen.svg)](https://greenkeeper.io/)

Generate JavaScript GraphQL schema from the GraphQL language

[![Build Status](https://img.shields.io/travis/ForbesLindesay/graphql-schema-gen/master.svg)](https://travis-ci.org/ForbesLindesay/graphql-schema-gen)
[![Dependency Status](https://img.shields.io/david/ForbesLindesay/graphql-schema-gen.svg)](https://david-dm.org/ForbesLindesay/graphql-schema-gen)
[![NPM version](https://img.shields.io/npm/v/graphql-schema-gen.svg)](https://www.npmjs.org/package/graphql-schema-gen)

## Installation

    npm install graphql-schema-gen


## Usage

```js
var createQueryFn = require('graphql-schema-gen');

var query = createQueryFn(`
scalar Date

union Animal =
  Cat |
  Dog

enum Role {
  # Means a user has full administrative access to everything
  Admin
  # Means a user has ability to moderate comments
  Moderator
  # Means a user has read only access
  None
}

type Cat {
  nightVision: String
}
type Dog {
  woof: String
}

interface Node {
  id: ID!
}

# A type to represent a person
type Person implements Node {
  id: GlobalID
  name: String
  dateOfBirth: Date
  role: Role
  friends(): [Person]!
  pet(): Animal
  hello(name: String = "World"): String
}

type Query {
  me(): Node
}
`, {
  Date: {
    serialize(value) {
      return /^\d\d\d\d\-\d\d\-\d\d$/.test(value) ? value : null;
    },
    parse(value) {
      return /^\d\d\d\d\-\d\d\-\d\d$/.test(value) ? value : null;
    }
  },
  Node: {
    resolveType(node, info) {
      return info.schema.getType(node.type);
    }
  },
  Animal: {
    resolveType(node, info) {
      return info.schema.getType(node.type);
    }
  },
  Query: {
    me() {
      return {name: 'Forbes Lindesay', dateOfBirth: '1830-06-11', role: 'Admin', type: 'Person'};
    }
  },
  Person: {
    id(obj) {
      return obj.name;
    },
    pet() {
      return {
        woof: 'Woof Woof!',
        type: 'Dog'
      };
    },
    friends() {
      return [{name: 'jonn', dateOfBirth: 'whatever', role: 'None', type: 'Person'}];
    },
    hello(person, {name}, context) {
      return 'Hello ' + name;
    }
  }
});

query(`
{
  me {
    id
    ...on Person {
      role
      dateOfBirth
      name,
      friends { id, name, dateOfBirth, role }
      pet { ...on Dog {woof}}
      hello
      helloForbes: hello(name: "Forbes")
    }
  }
}
`, {}).then(function (result) {
  if (result.errors) {
    setTimeout(() => { throw result.errors[0]; }, 0);
  }
  console.dir(result, {colors: true, depth: 100});
});
```

## License

  MIT
