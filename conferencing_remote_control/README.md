# Remote-control feature

Prise de controle à distance dans une conference

## parcours utilisateurs

    - Agent : 
        - Doit uniquement cliquer sur le bouton "Contrôle à distance" / si il est seul dans une conference, rien ne se passe

    - Client :
        - Une confirmation de controle à distance lui est demandé après l'action de l'Agent, il peut accepter ou refuser
        - Si il accepte apiRTC vérifie si un partage d'écran coté client est en cours
            - il n'y a pas de partage d'écran : apiRTC propose de partagé un écran ou une fenetre (si le client refuse la procédure est abandonnée)
        - un téléchargement se lance
        - Le client doit executer le fichier .exe qui est téléchargé

    - Agent :
        - Le contrôle à distance est lancé, si l'agent passe la souris sur le partage d'écran du client, sa souris bouge

## Informations

    - Il faut que l'application soit lancée sur le port 5501 (provisoire)