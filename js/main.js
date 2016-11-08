const CLIENT_ID = '892148350256-1hojf0b667161met5k1uvnjbgeaitk9a.apps.googleusercontent.com';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const LINK_TYPE = {
  MOTHER: 0,
  FATHER: 1,
  SPOUSE: 2,
};

const RELATIONSHIP = {
  NONE: 0,
  SELF: 1,
  PARENT: 2,
  SIBLING: 3,
  GRANDPARENT: 4,
  AUNT_UNCLE: 5,
  COUSIN: 6,
  CHILD: 7,
  GRANDCHILD: 8,
  GREAT_GRANDPARENT: 9,
  GREAT_GRANDCHILD: 10,
};

class Simulation {
  constructor(nodes, links) {
    this.nodes = nodes;
    this.links = links;
    this.started = false;
    this.svg = null;
    this.sim = null;
  }

  start() {
    if (this.started) {
      return;
    }
    this.started = true;

    const WIDTH = 1280;
    const HEIGHT = 720;

    const MARGIN = {
      TOP: 10,
      RIGHT: 10,
      BOTTOM: 10,
      LEFT: 10,
    };

    // Create simulation
    this.sim = d3.forceSimulation(this.nodes)
      .force('charge', d3.forceManyBody())
      .force('link', d3.forceLink(this.links)
              .distance(k => {
                switch (k.type) {
                  case LINK_TYPE.MOTHER: 
                  case LINK_TYPE.FATHER: return 100; 
                  case LINK_TYPE.SPOUSE: return 20;
                  default: return 200;
                }
              }))
      .force('center', d3.forceCenter());

    const sim = this.sim;
    const DRAG = {
      START: e => {
        if (!d3.event.active) {
          sim.alphaTarget(0.3).restart();
        }
        e.fx = e.x;
        e.fy = e.y;
      },
      DRAG: e => {
        e.fx = d3.event.x;
        e.fy = d3.event.y;
      },
      END: e => {
        if (!d3.event.active) {
          sim.alphaTarget(0);
        }
        e.fx = null;
        e.fy = null;
      },
    };

    // Create svg
    this.svg = d3.select('#root')
          .attr('width', WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
          .attr('height', HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);

    this.root = this.svg.append('g')
          .attr('transform',
                `translate(${WIDTH / 2}, ${HEIGHT / 2})`);

    this.vNodes = this.root.selectAll('.node')
          .data(this.nodes)
        .enter().append('g')
          .attr('class', 'node')
          .call(d3.drag()
              .on('start', DRAG.START)
              .on('drag', DRAG.DRAG)
              .on('end', DRAG.END))
          .on('click', n => {
            this.applyRelationshipColoring(n);
            setIdVisible('info-wrapper', true);
            setIdVisible('info-instruction-wrapper', false);
            decorateNodeInfoCard(n);
          });

    this.vCircles = this.vNodes
        .append('circle')
          .attr('r', 10);

    this.vTooltips = this.vNodes
        .append('text')
          .attr('class', 'label')
          .attr('dx', 12)
          .attr('dy', '0.35em')
          .text(n => n.name);

    this.vLinks = this.root.selectAll('.link')
          .data(this.links).enter()
        .append('line')
          .attr('class', 'link')
          .classed('mother', k => k.type === LINK_TYPE.MOTHER)
          .classed('father', k => k.type === LINK_TYPE.FATHER)
          .classed('spouse', k => k.type === LINK_TYPE.SPOUSE);

    const onTick = () => {
      this.vNodes
            .classed('selected', n => n.depth === 0)
            .classed('dist-1', n => n.depth === 1)
            .classed('dist-2', n => n.depth === 2)
            .classed('dist-3', n => n.depth === 3)
            .classed('self', n => n.relationship === RELATIONSHIP.SELF)
            .classed('parent', n => n.relationship === RELATIONSHIP.PARENT)
            .classed('sibling', n => n.relationship === RELATIONSHIP.SIBLING)
            .classed('aunt-uncle', n => n.relationship === RELATIONSHIP.AUNT_UNCLE)
            .classed('grandparent', n => n.relationship === RELATIONSHIP.GRANDPARENT)
            .classed('cousin', n => n.relationship === RELATIONSHIP.COUSIN)
            .classed('child', n => n.relationship === RELATIONSHIP.CHILD)
            .classed('grandchild', n => n.relationship === RELATIONSHIP.GRANDCHILD)
            .classed('great-grandparent', n => n.relationship === RELATIONSHIP.GREAT_GRANDPARENT)
            .classed('great-grandchild', n => n.relationship === RELATIONSHIP.GREAT_GRANDCHILD)
            .attr('transform',
                  n => `translate(${n.x}, ${n.y})`);

      this.vLinks
           .attr('x1', k => k.source.x)
           .attr('y1', k => k.source.y)
           .attr('x2', k => k.target.x)
           .attr('y2', k => k.target.y);
    };

    this.sim.on('tick', onTick);
  }

  forRelevantLink(node, func) {
    this.links.forEach(link => {
      let them;
      if (link.source === node) {
        them = link.target;
      } else if (link.target === node) {
        them = link.source;
      }
      func(link, them);
    });
  }

  getParents(node) {
    const parents = [];
    this.forRelevantLink(node, (link, them) => {
      if (link.type === LINK_TYPE.MOTHER ||
          link.type === LINK_TYPE.FATHER) {
        if (link.source === them) {
          parents.push(them);
        }
      }         
    });
    return parents;
  }

  getSpouse(node) {
    let spouse = null;
    this.forRelevantLink(node, (link, them) => {
      if (link.type === LINK_TYPE.SPOUSE) {
        if (link.target === node) {
          spouse = link.source;
        } else if (link.source === node) {
          spouse = link.target;
        }
      }
    });
    return spouse;
  }

  getChildren(node) {
    const children = [];
    this.forRelevantLink(node, (link, them) => {
      if (link.type === LINK_TYPE.MOTHER ||
          link.type === LINK_TYPE.FATHER) {
        if (link.source === node) {
          children.push(them);
        }
      }
    });
    return children;
  }

  getSiblings(node) {
    const parents = this.getParents(node);
    const siblings = [];
    parents.forEach(p => {
      this.forRelevantLink(p, (link, them) => {
        if (link.type === LINK_TYPE.MOTHER ||
            link.type === LINK_TYPE.FATHER) {
          if (link.source === p &&
              link.target !== node &&
              !siblings.includes(them)) {
            siblings.push(them);
          }
        }
      });
    });
    return siblings;
  }

  getGrandparents(node) {
    const parents = this.getParents(node);
    const grandparents = [];
    parents.forEach(p => {
      const pps = this.getParents(p);
      pps.forEach(gp => {
        grandparents.push(gp);
      });
    });
    return grandparents;
  }

  getGreatGrandparents(node) {
    const grandparents = this.getGrandparents(node);
    const greatGrandparents = [];
    grandparents.forEach(gp => {
      this.getParents(gp).forEach(ggp => {
        greatGrandparents.push(ggp);
      });
    });
    return greatGrandparents;
  }

  getAuntsAndUncles(node) {
    const parents = this.getParents(node);
    const auntsAndUncles = [];
    parents.forEach(p => {
      const siblings = this.getSiblings(p);
      siblings.forEach(s => {
        auntsAndUncles.push(s);
        const spouse = this.getSpouse(s);
        if (spouse !== null) {
          auntsAndUncles.push(spouse);
        }
      });
    });

    return auntsAndUncles;
  }

  getCousins(node) {
    const auntsUncles = this.getAuntsAndUncles(node);
    const cousins = [];
    auntsUncles.forEach(aunt => {
      const children = this.getChildren(aunt);
      children.forEach(child => {
        if (!cousins.includes(child)) {
          cousins.push(child);
        }
      });
    });
    return cousins;
  }

  getGrandchildren(node) {
    const children = this.getChildren(node);
    const grandchildren = [];
    children.forEach(child => {
      const gc = this.getChildren(child);
      gc.forEach(c => {
        grandchildren.push(c);
      });
    });
    return grandchildren;
  }

  getGreatGrandchildren(node) {
    const grandchildren = this.getGrandchildren(node);
    const greatGrandchildren = [];
    grandchildren.forEach(gc => {
      this.getChildren(gc).forEach(ggc => {
        greatGrandchildren.push(ggc);

      });
    });
    return greatGrandchildren;
  }

  bfs(queue) { 
    if (queue.length === 0) {
      return;
    }

    const node = queue.shift();

    this.links.forEach(link => {
      if (link.source === node) {
        if (!link.target.visited) {
          link.target.visited = true;
          link.target.depth = node.depth + 1;
          queue.push(link.target);
        }
      } else if (link.target === node) {
        if (!link.source.visited) {
          link.source.visited = true;
          link.source.depth = node.depth + 1;
          queue.push(link.source);
        }
      }
    });

    this.bfs(queue);
  }

  applyRelationshipColoring(node) {
    this.nodes.forEach(n => {
      n.relationship = RELATIONSHIP.NONE;
    });

    node.relationship = RELATIONSHIP.SELF;

    this.getParents(node).forEach(n => {
      n.relationship = RELATIONSHIP.PARENT;
    });

    this.getSiblings(node).forEach(n => {
      n.relationship = RELATIONSHIP.SIBLING;
    });

    this.getAuntsAndUncles(node).forEach(n => {
      n.relationship = RELATIONSHIP.AUNT_UNCLE;
    });

    this.getGrandparents(node).forEach(n => {
      n.relationship = RELATIONSHIP.GRANDPARENT;
    });

    this.getCousins(node).forEach(n => {
      n.relationship = RELATIONSHIP.COUSIN;
    });

    this.getChildren(node).forEach(n => {
      n.relationship = RELATIONSHIP.CHILD;
    });

    this.getGrandchildren(node).forEach(n => {
      n.relationship = RELATIONSHIP.GRANDCHILD;
    });

    this.getGreatGrandparents(node).forEach(n => {
      n.relationship = RELATIONSHIP.GREAT_GRANDPARENT;
    });

    this.getGreatGrandchildren(node).forEach(n => {
      n.relationship = RELATIONSHIP.GREAT_GRANDCHILD;
    });
  }

  applyDepthColoring(node) {
    this.nodes.forEach(n => {
      n.visited = false;
      n.depth = -1;
    });

    const queue = [];
    node.depth = 0;
    node.visited = true;
    queue.push(node);

    this.bfs(queue);
  }
}

const decorateNodeInfoCard = (node) => {
  document.getElementById('info-name')
   .innerHTML = node.name;
  document.getElementById('info-blurb')
   .innerHTML = node.blurb;
};

let sim = null;

const checkAuth = () => {
    gapi.auth.authorize({
        client_id: CLIENT_ID,
        scope: SCOPES,
        immediate: true,
    }, handleAuthResult);
};

const handleAuthResult = authResult => {
    const authorizeDiv = document.getElementById('authorize-div');
    if (authResult && !authResult.error) {
        authorizeDiv.style.display = 'none';
        loadSheetsApi();
    } else {
        authorizeDiv.style.display = 'inline';
    }
};

const handleAuthClick = event => {
    gapi.auth.authorize({
        client_id: CLIENT_ID,
        scope: SCOPES,
        immediate: false,
    }, handleAuthResult);
    return false;
};

const setIdVisible = (id, visible) => {
    const visStr = visible ? 'block' : 'none';
    document.getElementById(id).style.display = visStr;
};

const setLoadingVisible = visible => {
  setIdVisible('loading-overlay', visible);
};

const setSvgVisible = visible => {
  setIdVisible('svg-wrapper', visible); 
};

const parseNodes = table => table.map(row => ({
  name: row[0],
  blurb: row[4] || '',
}));

const parseLinks = (table, nodes) => {
  const namesToNodes = {};
  nodes.forEach(n => {
    namesToNodes[n.name] = n;
  });

  console.log(namesToNodes);
  const links = [];
  const linkIds = [1 /* mother */, 2 /* father */, 3 /* spouse */];
  table.forEach(row => {
    linkIds.forEach(id => {
      if (row[id]) {
        links.push({
          source: namesToNodes[row[id]],
          target: namesToNodes[row[0]],
          type: id - 1,
        });
      }
    });
  });

  return links;
};


const startForce = result => {
    setLoadingVisible(false);
    setSvgVisible(true);
    console.log(result.result);

    const table = result.result.values
        .filter(v => v[0]);
    const nodes = parseNodes(table);
    const links = parseLinks(table, nodes);

    console.log(nodes);
    console.log(links);
    
    sim = new Simulation(nodes, links);
    sim.start();
};


const loadSheetData = sheetHandler => {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: '1Vj9W2WfvG860sqfrBZReS9wp6pulPGGOKuESkNlkGUU',
        range: 'Tree!B4:F100',
    }).then(sheetHandler);
};

const loadSheetsApi = () => {
    const discoveryUrl = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
    gapi.client.load(discoveryUrl).then(() => loadSheetData(startForce));
};

const appendPre = message => {
    const pre = document.getElementById('output');
    const textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
};

window.onload = () => {
    setTimeout(checkAuth, 200);
};
