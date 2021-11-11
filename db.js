const griddb = require('griddb_node');

const putRow = (container) => async (val) => {
  try {
    const p = 1000;
    const now = new Date();
    const time = new Date(Math.round(now.getTime() / p ) * p);
    await container.put([time, val]);
  } catch (err) {
    console.log(err);
  }
}

const getLatestRows = (container) => async (resolution) => {
  try {
    let tql;
    switch(resolution) {
      case 'hours':
        tql = "select TIME_SAMPLING(freeMemPercentage, TIMESTAMPADD(HOUR, NOW(), -24), NOW(), 1, HOUR)"
        break;
      case 'minutes':
        tql = "select TIME_SAMPLING(freeMemPercentage, TIMESTAMPADD(MINUTE, NOW(), -60), NOW(), 1, MINUTE)"
        break;
      default:
        tql = "select TIME_SAMPLING(freeMemPercentage, TIMESTAMPADD(MINUTE, NOW(), -1), NOW(), 1, SECOND)"
    }
    const query = container.query(tql);
    const rowset = await query.fetch();
    const data = [];
    while (rowset.hasNext()) {
      data.push(rowset.next());
    }
    return data;
  } catch(err) {
    console.log(err);
  }
}

const dropContainer = (store, containerName) =>  async function () {
  await store.dropContainer(containerName);
}

const createContainer = async (store) => {
  const containerName = "FreeMemoryPercentage";
  let container = await store.getContainer(containerName);
  if (container === null) {
    try {
      const schema = new griddb.ContainerInfo({
        name: containerName,
        columnInfoList: [
          ["timestamp", griddb.Type.TIMESTAMP],
          ["freeMemPercentage", griddb.Type.DOUBLE]
        ],
        type: griddb.ContainerType.TIME_SERIES,
        rowKey: true
      });
      container = await store.putContainer(schema, false);
    } catch (err) {
      console.log(err);
    }
  }
  return {
    putRow: putRow(container),
    getLatestRows: getLatestRows(container),
    dropContainer: dropContainer(store, containerName)
  }
}

const connect = async () => {
  const factory = griddb.StoreFactory.getInstance();
  const store = factory.getStore({
    "notificationMember": "griddb:10001",
    "clusterName": "defaultCluster",
    "username": "admin",
    "password": "admin"
  });
  return createContainer(store);
};

module.exports = { connect };
