// Import necessary classes
// Assuming these classes are available globally or through a module system
// import { BondManipulator } from './BondManipulator';
// import { MoleculeInfo } from './moleculeInfo';
// import { MoleculeRenderer } from './moleculeRenderer';

class Actions {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.renderer = new MoleculeRenderer(canvasId);
        this.moleculeIds = []; // Add this line to store molecule IDs
    }

    async addMolecule(smiles, showNumbers = false) {
        try {
            const moleculeInfo = new MoleculeInfo();
            await moleculeInfo.initializeMolecule(smiles, true);
            const bondManipulator = new BondManipulator(moleculeInfo, this.renderer);
            const id = this.renderer.addMolecule(moleculeInfo, bondManipulator, showNumbers);
            this.moleculeIds.push(id); // Store the ID
            this.renderer.renderMolecules(); // Add this line to ensure rendering after adding
            return id;
        } catch (error) {
            console.error('Error adding molecule:', error);
            throw error;
        }
    }

    async resetMolecules(smilesArray) {
        for (let i = 0; i < smilesArray.length; i++) {
            const moleculeInfo = new MoleculeInfo();
            await moleculeInfo.initializeMolecule(smilesArray[i], true);
            const id = this.moleculeIds[i];
            this.renderer.updateMolecule(id, moleculeInfo);
        }
        this.renderer.renderMolecules();
    }

    // Method to move an electron pair from a bond to the second atom
    B2A(moleculeIndex, bondIdentifier) {
        const id = this.moleculeIds[moleculeIndex];
        const molecule = this.renderer.moleculeMap.get(id);
        if (!molecule || !molecule.bondManipulator) {
            console.error(`No bond manipulator found for molecule at index ${moleculeIndex}`);
            return;
        }
        console.log(`Triggering B2A for molecule ${id}, bond ${bondIdentifier}`);
        molecule.bondManipulator.moveElectronPairFromBondToAtom(bondIdentifier);
        this.renderer.startAnimation();
    }


    
    A2B(bondIdentifier) {
        const [atom1, atom2] = bondIdentifier.split('-').map(Number);
        this.bondManipulator.moveElectronPairFromBondToAtom(bondIdentifier);
        // Add this line:
        //this.bondManipulator.startBondTransition(atom1, atom2, 'increase', bondIdentifier);
        
    }

    // Updated B2B method to use molecule index
    B2B(moleculeIndex, bondIdentifier) {
        const id = this.moleculeIds[moleculeIndex];
        const molecule = this.renderer.moleculeMap.get(id);
        if (!molecule || !molecule.bondManipulator) {
            console.error(`No bond manipulator found for molecule at index ${moleculeIndex}`);
            return;
        };
        molecule.bondManipulator.moveElectronsBetweenBonds(bondIdentifier);
        this.renderer.startAnimation(); // Ensure animation is running
    }
    //method to create free radicals
    B2ASingle(bondIdentifier) {
        this.bondManipulator.B2ASingle(bondIdentifier);
    }
}



