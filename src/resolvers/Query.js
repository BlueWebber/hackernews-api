async function feed(parent, args, context) {
  const where = args.filter
    ? {
        OR: [
          { description: { contains: args.filter } },
          { url: { contains: args.filter } },
        ],
      }
    : {};
  const links = context.prisma.link.findMany({
    where,
    skip: args.skip,
    take: args.take,
    orderBy: args.orderBy,
  });

  const count = context.prisma.link.count({ where });

  return {
    links,
    count,
  };
}

function info() {
  return "this is a graphQL api";
}

module.exports = {
  feed,
  info,
};
