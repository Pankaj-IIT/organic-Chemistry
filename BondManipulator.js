/**
 The BondManipulator.js file is responsible for handling the manipulation of bonds within a molecule. It provides functionality to change bond orders and manage electron movements, which are crucial for simulating chemical reactions or visualizing changes in molecular structures. Here's a breakdown of its key roles and functionalities:
Initialization:
The BondManipulator class is initialized with a MoleculeInfo instance and a MoleculeRenderer instance. This allows it to access molecular data and update the visual representation of the molecule.
2. Bond Manipulation:
The moveElectronPairFromBondToAtom method allows for the manipulation of a specific bond identified by a bond identifier (e.g., '1-2' for a bond between atoms 1 and 2). It supports different types of electron movements, such as 'combined' and 'split'.
It updates the charges on the atoms involved in the bond based on the type of electron movement.
3. Animation of Bond Transitions:
The startBondTransition method initiates an animation to visually represent the transition of a bond from one state to another. This includes changing bond orders and moving electrons.
The animation is handled using requestAnimationFrame to smoothly update the bond's visual state over time.
4. Charge Management:
The updateCharges method adjusts the formal charges of the atoms involved in a bond based on the electron movement type. This is important for accurately representing the electronic state of the molecule.
5. Utility Methods:
findBondIndex helps locate the index of a bond between two atoms within the molecule.
getBondTransitionProgress retrieves the current progress of a bond transition, which is used by the renderer to update the visual representation.
getCharge returns the current charge of a specific atom, which can be used to display charge information in the visualization.
Overall, BondManipulator.js is a crucial component for dynamically altering molecular structures and visualizing these changes, providing an interactive way to explore chemical reactions and molecular behavior.
 */
class BondManipulator {
  constructor(moleculeInfo, renderer) {
    this.moleculeInfo = moleculeInfo;
    this.renderer = renderer;
    this.bondTransitions = new Map();
    this.charges = new Map();

    // Initialize charges for all atoms
    const atomCount = this.moleculeInfo.getAtomCount();
    for (let i = 0; i < atomCount; i++) {
      this.charges.set(i, this.moleculeInfo.getFormalCharge(i));
    }
  }

  // Updated method to move electrons from the first atom in the bond to the bond
  moveElectronPairFromAtomToBond(bondIdentifier) {
    const [atom1, atom2] = bondIdentifier.split('-').map(Number);
    const donorAtom = atom1; // The first atom in the identifier is the donor
    const receiverAtom = atom2; // The second atom in the identifier is the receiver
    console.log(`Attempting to move electron pair from atom ${donorAtom} to bond ${bondIdentifier}`);
    
    const molecule = this.moleculeInfo.getMolecule();
    if (!molecule) {
      console.error('Molecule is not initialized.');
      return;
    }

    // Check if donor atom has a negative charge or lone pair
    const donorCharge = this.getCharge(donorAtom);
    const donorLonePairs = this.moleculeInfo.getLonePairs(donorAtom);

    if (donorCharge < 0 || donorLonePairs > 0) {
      // Start the bond transition animation
      console.log("i am in");
      this.startBondTransition(donorAtom, receiverAtom, 'increase', donorAtom);

      // Update the bond order
      const currentOrder = this.moleculeInfo.getBondOrder(atom1, atom2);
      if (currentOrder < 3) {
        this.moleculeInfo.setBondOrder(atom1, atom2, currentOrder + 1);
        console.log("current order: " + this.moleculeInfo.getBondOrder(atom1, atom2));
        // Update charges using the updateCharges method
        this.updateCharges(donorAtom, receiverAtom, 'A2B');
      }
    } else {
      console.log(`Cannot move electron pair: donor atom ${donorAtom} has no negative charge or lone pairs.`);
    }
  }
  moveElectronPairFromBondToAtom(bondIdentifier) {
    console.log(`Manipulating bond: ${bondIdentifier}`);
    const [atom1, atom2] = bondIdentifier.split('-').map(Number);
    this.startBondTransition(atom1, atom2, 'decrease', 'bond-to-atom');
    
    // Update charges: atom2 (receiving atom) gets -1 charge, atom1 (donating atom) gets +1 charge
    this.updateCharge(atom2, -1);  // Receiving atom gets -1 charge
    this.updateCharge(atom1, +1);  // Donating atom gets +1 charge
  }
  // Always move electrons towards the second atom in the identifier
  moveElectronsBetweenBonds(bondPath) {
    console.log(`Moving electrons along bond path: ${bondPath}`);
    const [atom1, atom2, atom3] = bondPath.split('-').map(Number);
    this.startBondTransition(atom1, atom2, 'decrease', 'bond-to-bond');
    this.startBondTransition(atom2, atom3, 'increase', 'bond-to-bond');
    
    // Update charges: atom1 (start) gets +1 charge, atom3 (end) gets -1 charge, atom2 (middle) is unaffected
    this.updateCharge(atom1, +1);  // First atom in the path gets +1 charge
    this.updateCharge(atom3, -1);  // Last atom in the path gets -1 charge
    // atom2 (middle atom) charge remains unchanged
  }  
  B2ASingle(bondIdentifier) {
    console.log(`Splitting bond: ${bondIdentifier}`);
    const [atom1, atom2] = bondIdentifier.split('-').map(Number);
    const molecule = this.moleculeInfo.getMolecule();
    if (!molecule) {
      console.error('Molecule is not initialized.');
      return;
    }
    
    const currentBondOrder = this.moleculeInfo.getBondOrder(atom1, atom2);
    if (currentBondOrder > 0) {
      
      // Add single electrons to both atoms
      this.moleculeInfo.setSingleElectron(atom1, this.moleculeInfo.getSingleElectron(atom1) + 1);
      this.moleculeInfo.setSingleElectron(atom2, this.moleculeInfo.getSingleElectron(atom2) + 1);
      console.log(`Added single electrons to atoms ${atom1} and ${atom2}`);

      // Start the bond transition animation
      this.startBondTransition(atom1, atom2, 'decrease');
    } else {
      console.log("Bond order is already 0, cannot split further.");
    }
  }
    // Helper method to update charges
  updateCharges(atom1, atom2, movementType) {
      const charge1 = this.getCharge(atom1);
      const charge2 = this.getCharge(atom2);
      if (movementType === 'A2B') {
        this.charges.set(atom1, charge1 + 1);
        this.charges.set(atom2, charge2 - 1);
          // Check if the donor atom has available electrons to move
        let lonePairs = this.moleculeInfo.getLonePairs(atom1);
        if (this.getCharge(atom1) < 0 || lonePairs > 0) {
          // Decrease lone pairs if available, otherwise the charge update is sufficient
          if (lonePairs > 0) {
            this.moleculeInfo.lonePairs[atom1] = lonePairs - 1;
          }
        } else {
          console.warn('No electron pair available to move from atom:', atom1);
          return;
        }
      } else if (movementType === "combined") { //if both electron move from bond to atom
        this.charges.set(atom1, charge1 - 1);
        this.charges.set(atom2, charge2 + 1);
      } else if (movementType === 'B2B') {
        
        this.charges.set(atom1, charge1 -1 );
        this.charges.set(atom2, charge2 + 1);
      }
      
      
    }
  
    // Helper method to get the current charge of an atom
  getCharge(atom) {
      return this.charges.get(atom) ?? 0; // Return 0 if no charge is set
    }
    
  // New method to move electrons from one bond to another




  startBondTransition(atom1, atom2, bondChange, electronMovement) {
    const bondKey = `${Math.min(atom1, atom2)}-${Math.max(atom1, atom2)}`;
    const initialOrder = this.moleculeInfo.getBondOrder(atom1, atom2);
    const targetOrder = bondChange === 'increase' ? Math.min(3, initialOrder + 1) : Math.max(0, initialOrder - 1);

    this.bondTransitions.set(bondKey, {
      progress: 0,
      initialOrder,
      targetOrder,
      bondChange,
      electronMovement,
      atom1,
      atom2
    });

    const animate = () => {
      const transitionInfo = this.bondTransitions.get(bondKey);
      if (!transitionInfo) return;

      transitionInfo.progress = Math.min(transitionInfo.progress + 0.005, 1);
      console.log(`Bond ${bondKey} transition progress: ${transitionInfo.progress}`);
      this.bondTransitions.set(bondKey, transitionInfo);

      if (transitionInfo.progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.moleculeInfo.setBondOrder(atom1, atom2, transitionInfo.targetOrder);
        this.bondTransitions.delete(bondKey);
      }

      this.renderer.renderMolecules();
    };

    animate();
  }

  getBondTransitionProgress(atom1, atom2) {
    return this.bondTransitions.get(`${Math.min(atom1, atom2)}-${Math.max(atom1, atom2)}`);
  }

  updateCharge(atomIndex, change) {
    const currentCharge = this.charges.get(atomIndex);
    this.charges.set(atomIndex, currentCharge + change);
    console.log(`Updated charge for atom ${atomIndex}: ${this.charges.get(atomIndex)}`);
  }

  getCharge(atomIndex) {
    return this.charges.get(atomIndex);
  }
}






