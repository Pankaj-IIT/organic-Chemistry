/*
 The MoleculeInfo class in moleculeInfo.js is designed to store and manage information about a molecule. Here's a breakdown of the information it handles:
Molecule Object:
The class stores a molecule object initialized from a SMILES string using the OpenChemLib library. This object is used to access various properties and methods related to the molecule.
Lone Pairs:
The class maintains a dictionary (lonePairs) to store the number of lone pairs for each atom in the molecule. It calculates these based on the atom type and formal charge.
Default Lone Pairs:
A dictionary (defaultLonePairs) is defined to store the typical number of lone pairs for common atom types like Oxygen and Nitrogen.
4. Coordinates:
The class retrieves 3D coordinates for each atom in the molecule, which can be used for rendering or further analysis.
Bond Types:
It extracts information about the bonds in the molecule, including the atoms involved and the bond order (single, double, triple, etc.).
Formal Charges:
The class stores the formal charge for each atom, which is used to adjust lone pairs and can be displayed in visualizations.
Methods:
calculateLonePairs(): Calculates and stores the number of lone pairs for each atom.
getMoleculeInfo(smiles, showImplicitHydrogens): Initializes the molecule from a SMILES string and retrieves various properties like coordinates, bond types, and formal charges.
getMolecule(): Returns the current molecule object.
getAtomSymbol(index): Returns the symbol of an atom by its index.
getLonePairs(atomIndex): Returns the number of lone pairs for a specific atom.
This class is essential for managing and providing detailed information about the molecule, which can be used by other components like the renderer or bond manipulator.
 */
class MoleculeInfo {
  constructor() {
    this.molecule = null; // Initialize molecule as null
    this.lonePairs = {}; // Dictionary to store lone pair information
    this.valenceElectrons = {
      'H': 1, 'C': 4, 'N': 5, 'O': 6, 'F': 7, 'Cl': 7, 'Br': 7, 'I': 7
      // Add more elements as needed
    };
    this.singleElectrons = {}; // New property to track single electrons
  }

  // Get the symbol of an atom by its index
  getAtomSymbol(index) {
    if (!this.molecule) {
      throw new Error('Molecule is not initialized.');
    }
    return this.molecule.getAtomLabel(index);
  }

  // Retrieve molecule information from a SMILES string
  async initializeMolecule(smiles, showImplicitHydrogens = true) {
    if (!smiles || typeof smiles !== 'string') {
      throw new Error('Invalid SMILES string.');
    }

    this.molecule = OCL.Molecule.fromSmiles(smiles);
    if (!this.molecule) {
      throw new Error('Failed to initialize molecule.');
    }

    this.molecule.addImplicitHydrogens();
    if (!showImplicitHydrogens) {
      this.removeImplicitHydrogens();
    }
    this.molecule.ensureHelperArrays(OCL.Molecule.cHelperRings);
    this.molecule.setFragment(false);
    this.initializeLonePairs();  // Add this line
  }

  removeImplicitHydrogens() {
    const atomCount = this.molecule.getAllAtoms();
    const hydrogensToRemove = new Set();

    for (let i = 0; i < atomCount; i++) {
      if (this.molecule.getAtomLabel(i) === 'C') {
        const connectedAtoms = this.molecule.getAllConnAtoms(i);
        for (let j = 0; j < connectedAtoms; j++) {
          const neighborIndex = this.molecule.getConnAtom(i, j);
          if (this.molecule.getAtomLabel(neighborIndex) === 'H') {
            hydrogensToRemove.add(neighborIndex);
          }
        }
      }
    }

    // Remove hydrogens after collecting all indices to avoid index shifting issues
    Array.from(hydrogensToRemove).sort((a, b) => b - a).forEach(hIndex => {
      this.molecule.deleteAtom(hIndex);
    });
  }

  getCoordinates3D() {
    if (!this.molecule) {
      console.error('Molecule is not initialized');
      return [];
    }
    const coordinates3D = [];
    for (let i = 0; i < this.molecule.getAllAtoms(); i++) {
      const x = this.molecule.getAtomX(i);
      const y = this.molecule.getAtomY(i);
      const z = this.molecule.getAtomZ(i);
      coordinates3D.push({ x, y, z });
    }
    return coordinates3D;
  }

  getBondTypes() {
    const bondCount = this.molecule.getAllBonds();
    const bondTypes = [];
    for (let i = 0; i < bondCount; i++) {
      const atom1 = this.molecule.getBondAtom(0, i);
      const atom2 = this.molecule.getBondAtom(1, i);
      const bondOrder = this.molecule.getBondOrder(i);
      let bondType;
      switch (bondOrder) {
        case 0:
          bondType='none';
          break;
        case 1:
          bondType = 'single';
          break;
        case 2:
          bondType = 'double';
          break;
        case 3:
          bondType = 'triple';
          break;
        default:
          bondType = 'other';
      }
      bondTypes.push({ atom1, atom2, type: bondType });
    }
    return bondTypes;
  }

  getFormalCharges() {
    const formalCharges = [];
    for (let i = 0; i < this.molecule.getAllAtoms(); i++) {
      const charge = this.molecule.getAtomCharge(i);
      formalCharges.push(charge);
    }
    return formalCharges;
  }

  // Get the current molecule object
  getMolecule() {
    return this.molecule;
  }

  // Get lone pairs for a specific atom
  getLonePairs(atomIndex) {
    return this.lonePairs[atomIndex] || 0;
  }

  getBondOrder(atom1, atom2) {
    const bondIndex = this.findBondIndex(atom1, atom2);
    return bondIndex !== -1 ? this.molecule.getBondOrder(bondIndex) : 0;
  }

  setBondOrder(atom1, atom2, newOrder) {
    const bondIndex = this.findBondIndex(atom1, atom2);
    if (bondIndex !== -1) {
      this.molecule.setBondOrder(bondIndex, newOrder);
    }
  }

  findBondIndex(atom1, atom2) {
    const bondCount = this.molecule.getAllBonds();
    for (let i = 0; i < bondCount; i++) {
      const bondAtom1 = this.molecule.getBondAtom(0, i);
      const bondAtom2 = this.molecule.getBondAtom(1, i);
      if ((bondAtom1 === atom1 && bondAtom2 === atom2) || (bondAtom1 === atom2 && bondAtom2 === atom1)) {
        return i;
      }
    }
    return -1;
  }

  initializeLonePairs() {
    const atomCount = this.molecule.getAllAtoms();
    this.lonePairs = {};

    for (let i = 0; i < atomCount; i++) {
      const atomSymbol = this.molecule.getAtomLabel(i);
      const formalCharge = this.molecule.getAtomCharge(i);
      const connectedAtoms = this.molecule.getAllConnAtoms(i);
      const bondOrders = this.getBondOrdersForAtom(i);
      const implicitHydrogens = this.molecule.getImplicitHydrogens(i);
      const explicitHydrogens = this.getExplicitHydrogens(i);
      
      // console.log(`Atom ${i} (${atomSymbol}):`);
      // console.log(`  Connected atoms: ${connectedAtoms}`);
      // console.log(`  Bond orders: ${bondOrders}`);
      // console.log(`  Implicit hydrogens: ${implicitHydrogens}`);
      // console.log(`  Explicit hydrogens: ${explicitHydrogens}`);
      
      this.lonePairs[i] = this.calculateLonePairs(
        i, // Pass the atom index
        atomSymbol, 
        formalCharge, 
        connectedAtoms, 
        bondOrders, 
        implicitHydrogens + explicitHydrogens
      );
      
      //console.log(`  Calculated lone pairs: ${this.lonePairs[i]}`);
    } 
  }

  getExplicitHydrogens(atomIndex) {
    let explicitHydrogens = 0;
    const connectedAtoms = this.molecule.getAllConnAtoms(atomIndex);
    for (let i = 0; i < connectedAtoms; i++) {
      const connectedAtom = this.molecule.getConnAtom(atomIndex, i);
      if (this.molecule.getAtomLabel(connectedAtom) === 'H') {
        explicitHydrogens++;
      }
    }
    return explicitHydrogens;
  }

  getBondOrdersForAtom(atomIndex) {
    const bondOrders = [];
    const connectedAtoms = this.molecule.getAllConnAtoms(atomIndex);
    for (let i = 0; i < connectedAtoms; i++) {
      const connectedAtom = this.molecule.getConnAtom(atomIndex, i);
      const bondIndex = this.findBondIndex(atomIndex, connectedAtom);
      let bondOrder = this.molecule.getBondOrder(bondIndex);
      // Handle aromatic bonds
      if (bondOrder === 0 && this.molecule.isAromaticBond(bondIndex)) {
        bondOrder = 1.5;  // Treat aromatic bonds as 1.5 order
      }
      bondOrders.push(bondOrder);
    }
    return bondOrders;
  }

  calculateLonePairs(atomIndex, atomSymbol, formalCharge, connectedAtoms, bondOrders, implicitHydrogens) {
    if (this.valenceElectrons[atomSymbol] === undefined) {
      return 0; // Return 0 for unknown atoms
    }

    const valence = this.valenceElectrons[atomSymbol];
    let totalBondOrder = bondOrders.reduce((sum, order) => sum + order, 0) + implicitHydrogens;
    // Adjust totalBondOrder for non-carbon atoms with implicit hydrogens
    if (atomSymbol !== 'C' && implicitHydrogens > 0) {
      totalBondOrder = bondOrders.reduce((sum, order) => sum + order, 0);
    }
    // Calculate the number of electrons involved in bonding
    const bondingElectrons = totalBondOrder;
    
    // Calculate the number of non-bonding electrons
    const nonBondingElectrons = valence - bondingElectrons + formalCharge;
    
    // Calculate the number of lone pairs
    const lonePairs = Math.max(0, Math.floor(nonBondingElectrons / 2));
    const singleElectrons = nonBondingElectrons % 2;

    this.setSingleElectron(atomIndex, singleElectrons);

    return lonePairs;
  }

  setSingleElectron(atomIndex, count) {
    this.singleElectrons[atomIndex] = count;
  }

  getSingleElectron(atomIndex) {
    return this.singleElectrons[atomIndex] || 0;
  }

  getAtomCount() {
    return this.molecule.getAllAtoms();
  }

  getFormalCharge(atomIndex) {
    return this.molecule.getAtomCharge(atomIndex);
  }

  getAtomIndex(x, y, scale = 1) {
    const atomCount = this.molecule.getAllAtoms();
    const tolerance = 0.3 * scale; // Adjust based on rendering scale
    let closestAtom = -1;
    let minDistance = Infinity;

    for (let i = 0; i < atomCount; i++) {
      const dx = (x / scale) - this.molecule.getAtomX(i);
      const dy = (y / scale) - this.molecule.getAtomY(i);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestAtom = i;
      }
    }

    return minDistance <= tolerance ? closestAtom : -1;
  }
  getAtomPosition(atomIndex) {
    // Check if the atomIndex is valid
    if (atomIndex < 0 || atomIndex >= this.atoms.length) {
      console.error(`Invalid atom index: ${atomIndex}`);
      return null; // Return null for invalid index
    }
    
    const atom = this.atoms[atomIndex];
    return atom ? atom.position : null; // Return the position or null if not found
  }

}
