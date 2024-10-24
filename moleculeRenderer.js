/**
 The moleculeRenderer.js file is responsible for rendering a visual representation of a molecule on an HTML canvas element. Here's a breakdown of its key roles and functionalities:
1. Initialization:
The MoleculeRenderer class is initialized with a canvas ID, which it uses to get the canvas element and its drawing context.
It sets up default properties such as scale factor, current SMILES string, and options for displaying implicit hydrogens and atom numbers.
2. Rendering Molecules:
The renderMolecule method takes a SMILES string and options for displaying implicit hydrogens and atom numbers. It retrieves molecule data using the MoleculeInfo class and then draws the molecule on the canvas.
It handles clearing the canvas before drawing and manages the rendering of atoms and bonds.
3. Drawing Atoms and Bonds:
The drawAtom method is responsible for drawing individual atoms, including their symbols, optional atom numbers, charges, and lone pairs.
The drawBond method draws bonds between atoms, considering bond types (single, double, triple) and any ongoing bond transitions.
4. Bond Transitions:
The renderer can visualize bond transitions, such as changing bond orders and electron movements, using methods like drawTransitioningBond and drawMovingElectrons.
5. Utility Methods:
Methods like clear, setScaleFactor, and project3Dto2D help manage the rendering process, including clearing the canvas, setting the scale for rendering, and projecting 3D coordinates to 2D for display.
6. Integration with Bond Manipulator:
The renderer can integrate with a BondManipulator instance to dynamically update the visualization based on bond manipulations, such as electron movements and bond order changes.
Overall, moleculeRenderer.js is a crucial component for visualizing molecular structures, providing a graphical interface for users to interact with and understand molecular data.
 */
class MoleculeRenderer {
  constructor(canvasId) {
    // Initialize canvas and context for drawing
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.molecules = [];
    this.scaleFactor = 50;
    this.padding = 20; // Padding between molecules
    this.startX = 50; // Starting X position
    this.startY = 50; // Starting Y position
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.maxHeight = 0; // Max height of molecules in the current row
    this.moleculeInfo = new MoleculeInfo(); // Helper class for molecule data
    this.showImplicitHydrogens = true; // Default value
    this.showAtomNumbers = false; // Default value

    // Define color maps for atoms and bonds
    this.atomColors = {
      H: 'gray',
      C: 'black',
      O: 'red',
      N: 'blue',
      // Add more atom types as needed
    };

    this.bondColors = {
      single: 'black',
      double: 'red',
      triple: 'green',
      other: 'purple',
    };

    this.isAnimating = false;
    this.animationFrameId = null;
    this.moleculeMap = new Map();
  }

  // Render a molecule based on SMILES string
  async initialize(smiles, showImplicitHydrogens = true, showAtomNumbers = false) {
    this.moleculeInfo = new MoleculeInfo();
    await this.moleculeInfo.initializeMolecule(smiles, showImplicitHydrogens);
    this.showAtomNumbers = showAtomNumbers;
    this.renderMolecule();
  }

  renderMolecule(moleculeInfo) {
    if (!moleculeInfo) {
      console.error('MoleculeInfo is not provided');
      return;
    }
  
    const moleculeData = {
      coordinates3D: moleculeInfo.getCoordinates3D(),
      bondTypes: moleculeInfo.getBondTypes(),
      formalCharges: moleculeInfo.getFormalCharges(),
    };
    // Get the existing position of the molecule
    const existingMolecule = this.molecules.find(m => m.moleculeInfo === moleculeInfo);
    let position = { x: 0, y: 0 };
    
    if (existingMolecule) {
      position = existingMolecule.position;
    }
    this.clear();
    this.drawMolecule(moleculeData, this.showAtomNumbers, position, moleculeInfo, this.bondManipulator);
  }

  // Clear the canvas
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Set bond manipulator for dynamic bond manipulation
  setBondManipulator(bondManipulator) {
    this.bondManipulator = bondManipulator;
    // Add this line to ensure the renderer has the latest moleculeInfo
    this.moleculeInfo = bondManipulator.moleculeInfo;
  }

  // Draw a bond between two atoms
  drawBond(start, end, bondType, atom1, atom2, bondManipulator) {
    
    const transitionInfo = bondManipulator && bondManipulator.getBondTransitionProgress(atom1, atom2);
    
    if (transitionInfo) {      
      console.log(`Drawing transitioning bond ${atom1}-${atom2}, progress: ${transitionInfo.progress}`);
      this.drawTransitioningBond(start, end, transitionInfo, atom2);
    } else {      
      this.drawNormalBond(start, end, bondType);
    }
  }

  // Draw a normal bond (single, double, triple)
  drawNormalBond(start, end, bondType) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.bondColors[bondType] || this.bondColors.single;
    ctx.lineWidth = 1;
    // Check if there's a bond between the atoms
    if (bondType === 'none') {
      // If there's no bond, don't draw anything
      return;
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (dy / length) * 3;
    const offsetY = -(dx / length) * 3;

    // Draw first line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    if (bondType === 'double' || bondType === 'triple') {
      // Draw second line
      ctx.beginPath();
      ctx.moveTo(start.x + offsetX, start.y + offsetY);
      ctx.lineTo(end.x + offsetX, end.y + offsetY);
      ctx.stroke();
    }

    if (bondType === 'triple') {
      // Draw third line
      ctx.beginPath();
      ctx.moveTo(start.x - offsetX, start.y - offsetY);
      ctx.lineTo(end.x - offsetX, end.y - offsetY);
      ctx.stroke();
    }
  }

  // Draw a transitioning bond with electron movement
  drawTransitioningBond(start, end, transitionInfo, atom2) {
    const { progress, initialOrder, targetOrder, bondChange, electronMovement } = transitionInfo;
    const currentOrder = initialOrder + (targetOrder - initialOrder) * progress;

    // Draw the transitioning bond
    this.drawInterpolateBond(start, end, currentOrder);

    // Draw moving electrons
    this.drawMovingElectrons(start, end, progress, electronMovement, atom2);
  }

  drawInterpolateBond(start, end, order) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const drawLine = (offset) => {
      const offsetX = Math.sin(angle) * offset;
      const offsetY = -Math.cos(angle) * offset;
      ctx.beginPath();
      ctx.moveTo(start.x + offsetX, start.y + offsetY);
      ctx.lineTo(end.x + offsetX, end.y + offsetY);
      ctx.stroke();
    };

    if (order <= 1) {
      drawLine(0);
    } else if (order <= 2) {
      drawLine(-1);
      drawLine(1);
    } else {
      drawLine(-2);
      drawLine(0);
      drawLine(2);
    }
  }

  drawMovingElectrons(start, end, progress, electronMovement, atom2) {
    const ctx = this.ctx;
    ctx.fillStyle = 'blue';
    const electronRadius = 2; // Slightly reduced size for two electrons

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    let position;
    if (electronMovement === 'bond-to-atom') {
      position = length * progress;
    } else if (electronMovement === 'bond-to-bond') {
      position = length * 0.5 * progress;
    }

    // Check if the end position matches atom2's position, otherwise swap start and end
    const atom2Pos = this.moleculeInfo.getAtomPosition(atom2);
    if (atom2Pos && (Math.abs(end.x - atom2Pos.x) > 0.1 || Math.abs(end.y - atom2Pos.y) > 0.1)) {
      // Swap start and end positions
      [start, end] = [end, start];
    }

    const electronCenterX = start.x + Math.cos(angle) * position;
    const electronCenterY = start.y + Math.sin(angle) * position;

    // Calculate perpendicular offset for the two electrons
    const perpendicularAngle = angle + Math.PI / 2;
    const offset = 3; // Distance between the two electrons

    // Draw first electron
    const electron1X = electronCenterX + Math.cos(perpendicularAngle) * offset;
    const electron1Y = electronCenterY + Math.sin(perpendicularAngle) * offset;
    ctx.beginPath();
    ctx.arc(electron1X, electron1Y, electronRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw second electron
    const electron2X = electronCenterX - Math.cos(perpendicularAngle) * offset;
    const electron2Y = electronCenterY - Math.sin(perpendicularAngle) * offset;
    ctx.beginPath();
    ctx.arc(electron2X, electron2Y, electronRadius, 0, 2 * Math.PI);
    ctx.fill();

    console.log(`Drawing electron pair at (${electronCenterX}, ${electronCenterY}), progress: ${progress}`);
  }

  getBondTypeFromOrder(order) {
    switch (order) {
      case 1: return 'single';
      case 2: return 'double';
      case 3: return 'triple';
      default: return 'single';
    }
  }

  // Draw an atom with optional atom number, charge, and lone pairs
  drawAtom(coord, atomSymbol, atomIndex, showAtomNumbers, formalCharge, moleculeInfo, bondManipulator) {
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = this.atomColors[atomSymbol] || 'black';
    this.ctx.fillText(atomSymbol, coord.x - 8, coord.y + 8);

    if (showAtomNumbers) {
      this.ctx.fillStyle = 'blue';
      this.ctx.fillText(atomIndex, coord.x + 10, coord.y + 8);
    }

    // Get the current charge from the bond manipulator
    let currentCharge = bondManipulator ? bondManipulator.getCharge(atomIndex) : formalCharge;

    // Draw the charge if it is not zero
    if (currentCharge !== 0) {
      this.ctx.fillStyle = 'purple'; // Use purple for charges
      this.ctx.font = '14px Arial';
      const chargeText = currentCharge > 0 ? `+${currentCharge}` : `${currentCharge}`;
      this.ctx.fillText(chargeText, coord.x + 3, coord.y - 10);
    }

    // Draw lone pairs using stored information
    const lonePairs = moleculeInfo.getLonePairs(atomIndex);
    this.drawLonePairs(coord, lonePairs);

    // Draw single electrons
    const singleElectrons = moleculeInfo.getSingleElectron(atomIndex);
    this.drawSingleElectrons(coord, singleElectrons);
  }

  // Draw lone pairs around an atom
  drawLonePairs(coord, numberOfLonePairs) {
    const ctx = this.ctx;
    const lonePairRadius = 2; // Radius of the lone pair dots
    const offset = 10; // Distance from the atom center

    ctx.fillStyle = 'blue'; // Color for lone pairs

    for (let i = 0; i < numberOfLonePairs; i++) {
      // Calculate positions for two electrons per lone pair
      const angle1 = (Math.PI / 2) * i;
      const angle2 = angle1 + Math.PI / 8; // Slightly offset the second electron

      const x1 = coord.x + offset * Math.cos(angle1);
      const y1 = coord.y + offset * Math.sin(angle1);

      const x2 = coord.x + offset * Math.cos(angle2);
      const y2 = coord.y + offset * Math.sin(angle2);

      // Draw first electron
      ctx.beginPath();
      ctx.arc(x1, y1, lonePairRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw second electron
      ctx.beginPath();
      ctx.arc(x2, y2, lonePairRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // New method to draw single electrons
  drawSingleElectrons(coord, numberOfSingleElectrons) {
    const ctx = this.ctx;
    const electronRadius = 3; // Slightly larger than lone pairs for visibility
    const offset = 15; // Slightly further from the atom center than lone pairs

    ctx.fillStyle = 'red'; // Color for single electrons

    for (let i = 0; i < numberOfSingleElectrons; i++) {
      const angle = (Math.PI / 6) * i;
      const x = coord.x - offset * Math.cos(angle);
      const y = coord.y + offset * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, electronRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Draw the entire molecule
  drawMolecule(moleculeData, showAtomNumbers, position = { x: 0, y: 0 }, moleculeInfo, bondManipulator) {
    const { coordinates3D, bondTypes, formalCharges } = moleculeData;
    
    this.ctx.save();
    this.ctx.translate(position.x, position.y);
    
    // Project 3D coordinates to 2D
    const coords2D = this.project3Dto2D(coordinates3D);
    
    // Draw bonds first
    bondTypes.forEach(bond => {
      const start = { ...coords2D[bond.atom1], atomIndex: bond.atom1 };
      const end = { ...coords2D[bond.atom2], atomIndex: bond.atom2 };
      this.drawBond(start, end, bond.type, bond.atom1, bond.atom2, bondManipulator);
    });
    // Draw atoms on top of bonds
    coords2D.forEach((coord, index) => {
      const atomSymbol = moleculeInfo.getAtomSymbol(index);
      this.drawAtom(coord, atomSymbol, index, showAtomNumbers, formalCharges[index], moleculeInfo, bondManipulator);
    });
    
    this.ctx.restore();
  }

  // Project 3D coordinates to 2D for rendering
  project3Dto2D(coords3D) {
    const centerX = 10;
    const centerY = this.canvas.height / 2;

    return coords3D.map(coord => ({
      x: coord.x * this.scaleFactor + centerX,
      y: -coord.y * this.scaleFactor + centerY // Invert y-axis
    }));
  }

  // Set the scale factor for rendering
  setScaleFactor(scale) {
    this.scaleFactor = scale;
  }

  // Get the current molecule object
  getMolecule() {
    return this.moleculeInfo.getMolecule();
  }

  addMolecule(moleculeInfo, bondManipulator, showAtomNumbers) {
    const id = `molecule_${this.moleculeMap.size}`; // Generate a unique ID
    const position = this.calculateNextPosition(moleculeInfo);
    const size = this.calculateMoleculeSize(moleculeInfo);

    this.moleculeMap.set(id, {
      moleculeInfo,
      bondManipulator,
      showAtomNumbers,
      position,
      size
    });

    this.renderMolecules();
    return id; // Return the unique ID instead of an index
  }

  calculateNextPosition(moleculeInfo) {
    const size = this.calculateMoleculeSize(moleculeInfo);
    
    if (this.currentX + size.width > this.canvas.width - this.padding) {
      // Start a new row
      this.currentX = this.startX;
      this.currentY += this.maxHeight + this.padding;
      this.maxHeight = 0;
    }

    const position = { x: this.currentX, y: this.currentY };

    // Update for next molecule
    this.currentX += size.width + this.padding;
    this.maxHeight = Math.max(this.maxHeight, size.height);

    return position;
  }

  calculateMoleculeSize(moleculeInfo) {
    const coords = moleculeInfo.getCoordinates3D();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    coords.forEach(coord => {
      minX = Math.min(minX, coord.x);
      minY = Math.min(minY, coord.y);
      maxX = Math.max(maxX, coord.x);
      maxY = Math.max(maxY, coord.y);
    });

    const width = (maxX - minX) * this.scaleFactor + 40;  // Add some padding
    const height = (maxY - minY) * this.scaleFactor + 40;

    return { width, height };
  }

  renderMolecules() {
    this.clear();
    for (const [id, molecule] of this.moleculeMap) {
      const { moleculeInfo, bondManipulator, showAtomNumbers, position } = molecule;
      const moleculeData = {
        coordinates3D: moleculeInfo.getCoordinates3D(),
        bondTypes: moleculeInfo.getBondTypes(),
        formalCharges: moleculeInfo.getFormalCharges(),
      };
      this.drawMolecule(moleculeData, showAtomNumbers, position, moleculeInfo, bondManipulator);
    }
  }

  startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  animate() {
    if (this.isAnimating) {
      this.renderMolecules();
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
  }

  getMolecules() {
    return Array.from(this.moleculeMap.values());
  }

  updateMolecule(id, newMoleculeInfo) {
    if (this.moleculeMap.has(id)) {
      const molecule = this.moleculeMap.get(id);
      molecule.moleculeInfo = newMoleculeInfo;
      molecule.bondManipulator = new BondManipulator(newMoleculeInfo, this);
    }
  }
}