const { withXcodeProject, withPodfile } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const path = require('path');
const fs = require('fs');

const POD_TAG = 'withWhisperPod';

// Chemin vers le modèle sur la machine de développement
const whisperModelPath = path.join(process.env.HOME, '.cache', 'whisper.cpp', 'ggml-tiny.en.bin');
const modelFileName = path.basename(whisperModelPath);

const withWhisper = (config) => {
  // Étape 1: Modifier le Podfile pour lier whisper.rn correctement
  config = withPodfile(config, (podfileConfig) => {
    const podLine = `  pod 'whisper-rn', :path => '${path.resolve(__dirname, '../node_modules/whisper.rn')}'`;
    const newContents = mergeContents({
      src: podfileConfig.modResults.contents,
      newSrc: podLine,
      anchor: /post_install do \|installer\|/,
      offset: 0,
      tag: POD_TAG,
      comment: '#',
    });
    podfileConfig.modResults.contents = newContents.contents;
    return podfileConfig;
  });

  // Étape 2: Modifier le projet Xcode pour inclure le modèle (DÉSACTIVÉ CAR LE PREBUILD ÉCHOUE)
  // config = withXcodeProject(config, (xcodeConfig) => {
  //   const { pbxProject } = xcodeConfig.modResults;

  //   // Vérifier si le fichier modèle existe sur le disque
  //   if (!fs.existsSync(whisperModelPath)) {
  //     console.warn(`[withWhisper] Le modèle Whisper n'a pas été trouvé à : ${whisperModelPath}. L'application pourrait ne pas fonctionner.`);
  //     return xcodeConfig;
  //   }

  //   const groupName = 'StickerDreamResources';

  //   // Crée un groupe pour nos ressources s'il n'existe pas, pour éviter les conflits
  //   const resourcesGroup = pbxProject.getPBXGroupByName(groupName);
  //   if (!resourcesGroup) {
  //     pbxProject.addPbxGroup([], groupName, '""');
  //   }

  //   // Ajoute le fichier aux ressources du projet. Cette méthode gère l'ajout au groupe
  //   // et à la phase de build "Copy Bundle Resources". C'est la méthode la plus sûre.
  //   pbxProject.addResourceFile(whisperModelPath, {
  //     target: pbxProject.getFirstTarget().uuid,
  //   });

  //   console.log(`[withWhisper] Le modèle ${modelFileName} a été ajouté aux ressources du projet.`);

  //   return xcodeConfig;
  // });

  return config;
};

module.exports = withWhisper;
