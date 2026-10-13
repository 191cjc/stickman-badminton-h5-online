package §_-2s§
{
   import Playtomic.Link;
   import Playtomic.Log;
   import §_-0V§.*;
   import §_-2g§.§_-24§;
   import §_-2g§.§_-2P§;
   import bobby.§ null§;
   import bobby.§ try§;
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import bobby.§_-2W§;
   import bobby.§_-3e§;
   import bobby.§_-3h§;
   import bobby.§_-6§;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.text.TextField;
   import flash.utils.setTimeout;
   import fx.ParticleConfetti;
   import ui.DeathScreen;
   import ui.FinishOverlay;
   import ui.WinOverlay;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol344")]
   public class §_-u§ extends §_-07§
   {
      
      public static var §_-3j§:§_-24§;
      
      public static var §_-1h§:§_-h§;
      
      public static var §const§:§_-h§;
      
      public static var §_-3c§:MovieClip;
      
      public static var §_-0m§:MovieClip;
      
      public static var §_-0l§:§ null§;
      
      public static var §import§:§_-h§;
      
      public static var §_-1i§:Class;
      
      public static var §_-1k§:Class;
      
      public static const §_-0o§:Number = 400;
      
      public static const §try §:Number = 33;
      
      public static const §_-2N§:Number = 50;
      
      public static const §_-4N§:Number = 125;
      
      public static var §_-28§:Boolean = false;
      
      public static var §_-3P§:Boolean = false;
      
      public var §_-37§:MovieClip;
      
      public var kongBtn:SimpleButton;
      
      public var mouseHitbox2:MovieClip;
      
      public var §_-2S§:MovieClip;
      
      public var §_-1u§:MovieClip;
      
      public var §_-0s§:MovieClip;
      
      public var §false§:MovieClip;
      
      public var §_-3m§:Symbol44hsrthtr;
      
      public var §_-4P§:TextField;
      
      public var §_-3y§:MovieClip;
      
      public var §_-i§:MovieClip;
      
      public var §_-3H§:MovieClip;
      
      public var §switch§:MovieClip;
      
      public var §_-23§:MovieClip;
      
      public var each:MovieClip;
      
      public var §_-0j§:MovieClip;
      
      private var §_-q§:String;
      
      private var §_-5M§:Number = 0;
      
      private var §while§:Number = 0;
      
      private var §_-58§:Number = 1;
      
      private var §_-v§:Number = 0;
      
      private var §_-42§:Boolean = false;
      
      private var §_-T§:Boolean = true;
      
      public function §_-u§(param1:String)
      {
         super();
         this.§_-q§ = param1;
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         §_-0v§.§_-31§ = true;
         §_-28§ = false;
         stage.focus = stage;
         super.handleStageAdd(param1);
         §_-3c§ = MovieClip(this.§_-3H§);
         §_-0m§ = MovieClip(this.§_-0j§);
         §_-0l§ = § null§(this.§_-3m§);
         stage.addEventListener("keyPressedEsc",this.gotoMenu);
         MovieClip(this.§switch§).x = §_-0l§.x - §_-4N§;
         MovieClip(this.§_-2S§).x = §_-0l§.x + §_-4N§;
         this.§_-0M§();
         if(this.§_-q§ == "multiplayer")
         {
            this.§_-2-§();
            §_-h§(§_-1h§).§_-3A§(1);
            §_-h§(§const§).§_-3A§(2);
            this.§_-3F§();
            this.§_-2v§();
         }
         else
         {
            this.nextLevel();
         }
         SimpleButton(this.kongBtn).addEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         MovieClip(this.§_-23§).addEventListener(MouseEvent.MOUSE_OVER,this.§_-1Z§);
         MovieClip(this.§_-23§).addEventListener(MouseEvent.MOUSE_OUT,this.§_-g§);
         MovieClip(this.mouseHitbox2).addEventListener(MouseEvent.MOUSE_OVER,this.§_-1Z§);
         MovieClip(this.mouseHitbox2).addEventListener(MouseEvent.MOUSE_OUT,this.§_-g§);
      }
      
      private function §_-1Z§(param1:MouseEvent) : void
      {
         § try§.show();
         trace(2);
      }
      
      private function §_-g§(param1:MouseEvent) : void
      {
         § try§.hide();
         trace(1);
      }
      
      private function kongClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"InGameLogo","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      private function §_-0A§() : void
      {
         §_-2W§.§_-55§(new ParticleConfetti(),this,§_-3e§.§ else§(0,stage.stageWidth),-10);
      }
      
      private function gotoMenu(param1:Event) : *
      {
         §_-3h§.§true §("shotgun.mp3");
         § try§.show();
         §_-0v§.§_-5q§(new §_-4o§());
      }
      
      public function §return§() : void
      {
         §_-0v§.§_-31§ = true;
         if(this.§_-q§ == "multiplayer")
         {
            §_-28§ = false;
            this.§_-5M§ = this.§while§ = 0;
            stage.focus = stage;
            this.§_-42§ = false;
            this.§_-3F§();
            this.§_-2v§();
         }
         else
         {
            --this.§_-v§;
            this.nextLevel();
         }
      }
      
      public function nextLevel() : void
      {
         §_-28§ = false;
         this.§_-42§ = false;
         this.§_-5M§ = this.§while§ = 0;
         this.§_-58§ = 1;
         stage.focus = stage;
         ++this.§_-v§;
         Log.LevelCounterMetric("StartedLevel",this.§_-v§,true);
         this.§_-0a§();
         this.§_-3F§();
         this.§_-2v§();
         § try§.hide();
      }
      
      public function §_-2v§() : void
      {
         var _loc1_:§_-2P§ = §_-2W§.§_-55§(new §_-2P§(),this,stage.stageWidth / 2,stage.stageHeight / 2);
         if(this.§_-v§ == 1)
         {
            _loc1_.§_-2C§ = "Round 1";
         }
         else if(this.§_-v§ == 2)
         {
            _loc1_.§_-2C§ = "Round 2";
         }
         else if(this.§_-v§ == 3)
         {
            _loc1_.§_-2C§ = "Quarter-Finals";
         }
         else if(this.§_-v§ == 4)
         {
            _loc1_.§_-2C§ = "Semi-Finals";
         }
         else if(this.§_-v§ == 5)
         {
            _loc1_.§_-2C§ = "Final Match";
         }
         if(this.§_-q§ == "multiplayer")
         {
            _loc1_.§_-2C§ = "Exhibition";
         }
         if(§_-1i§ == §_-2Q§)
         {
            _loc1_.§_-3Z§ = "Little \nTimmy";
         }
         else if(§_-1i§ == §_-18§)
         {
            _loc1_.§_-3Z§ = "Average \nJoe";
         }
         else if(§_-1i§ == §_-0S§)
         {
            _loc1_.§_-3Z§ = "Hairy \nHarry";
         }
         else if(§_-1i§ == §_-51§)
         {
            _loc1_.§_-3Z§ = "Naughty \nNadia";
         }
         else if(§_-1i§ == §_-2n§)
         {
            _loc1_.§_-3Z§ = "Pirate \nPete";
         }
         else if(§_-1i§ == §use §)
         {
            _loc1_.§_-3Z§ = "Top Hat \nSam";
         }
         else if(§_-1i§ == §_-5P§)
         {
            _loc1_.§_-3Z§ = "The Red \nDude";
         }
         else if(§_-1i§ == §_-5G§)
         {
            _loc1_.§_-3Z§ = "Robotron \n3000";
         }
         else if(§_-1i§ == override)
         {
            _loc1_.§_-3Z§ = "Flying \nToaster";
         }
         if(§_-1k§ == §_-2Q§)
         {
            _loc1_.§_-11§ = "Little \nTimmy";
         }
         else if(§_-1k§ == §_-18§)
         {
            _loc1_.§_-11§ = "Average \nJoe";
         }
         else if(§_-1k§ == §_-0S§)
         {
            _loc1_.§_-11§ = "Hairy \nHarry";
         }
         else if(§_-1k§ == §_-51§)
         {
            _loc1_.§_-11§ = "Naughty \nNadia";
         }
         else if(§_-1k§ == §_-2n§)
         {
            _loc1_.§_-11§ = "Pirate \nPete";
         }
         else if(§_-1k§ == §use §)
         {
            _loc1_.§_-11§ = "Top Hat \nSam";
         }
         else if(§_-1k§ == §_-5P§)
         {
            _loc1_.§_-11§ = "The Red \nDude";
         }
         else if(§_-1k§ == §_-5G§)
         {
            _loc1_.§_-11§ = "Robotron \n3000";
         }
         else if(§_-1k§ == override)
         {
            _loc1_.§_-11§ = "Flying \nToaster";
         }
         if(this.§_-v§ == 5)
         {
            _loc1_.§_-11§ = "Evil \nTwin";
         }
      }
      
      public function §_-3F§() : void
      {
         if(§_-3j§ != null)
         {
            §_-3j§.remove();
            §_-3j§ = null;
         }
         if(this.§_-58§ == 1)
         {
            §_-h§(§_-1h§).setupServe();
         }
         else
         {
            §_-h§(§const§).setupServe();
         }
         §_-3P§ = true;
      }
      
      public function §_-3R§(param1:Number, param2:Number) : void
      {
         if(§_-3j§ != null)
         {
            §_-3j§.remove();
         }
         §_-3j§ = §_-2W§.§_-55§(new §_-24§(),MovieClip(this.§_-0s§),param1,param2);
      }
      
      public function §_-0M§() : void
      {
         if(§_-1h§ != null)
         {
            §_-1h§.remove();
         }
         §_-1h§ = §_-2W§.§_-55§(new §_-1i§(),MovieClip(this.§_-i§),150,§_-0o§);
         §_-1h§.scaleX *= 1.25;
         §_-1h§.scaleY *= 1.25;
         § try§.hide();
         if(§_-1i§ == §_-18§ && this.§_-q§ != "multiplayer")
         {
         }
      }
      
      public function §_-2-§() : void
      {
         if(§const§ != null)
         {
            §const§.remove();
         }
         §const§ = §_-2W§.§_-55§(new §_-1k§(),MovieClip(this.§_-i§),500,§_-0o§);
         §const§.scaleX = -1;
         §const§.scaleX *= 1.25;
         §const§.scaleY *= 1.25;
      }
      
      public function §_-0a§() : void
      {
         var _loc1_:Number = NaN;
         var _loc2_:Number = NaN;
         var _loc3_:Number = NaN;
         var _loc4_:Number = NaN;
         var _loc5_:Array = null;
         if(§const§ != null)
         {
            §const§.remove();
         }
         _loc5_ = [§_-51§,§_-0S§,§_-2n§,§use §,§_-5P§];
         if(§_-1i§ == §_-5G§)
         {
            _loc5_ = [§_-51§,§_-0S§,§_-2n§,§use §,override];
         }
         if(this.§_-v§ == 1)
         {
            §_-1k§ = _loc5_[0];
            _loc1_ = 1.1;
            _loc3_ = 1;
            _loc2_ = 1;
            _loc4_ = 100;
            if(§_-1i§ == §_-5G§)
            {
               _loc4_ = 100;
            }
         }
         else if(this.§_-v§ == 2)
         {
            §_-1k§ = _loc5_[1];
            _loc1_ = 1.1;
            _loc3_ = 1;
            _loc2_ = 1;
            _loc4_ = 90;
            if(§_-1i§ == §_-5G§)
            {
            }
         }
         else if(this.§_-v§ == 3)
         {
            §_-1k§ = _loc5_[2];
            _loc1_ = 1.1;
            _loc3_ = 1;
            _loc2_ = 1;
            _loc4_ = 65;
            if(§_-1i§ == §_-5G§)
            {
            }
         }
         else if(this.§_-v§ == 4)
         {
            §_-1k§ = _loc5_[3];
            _loc1_ = 1.1;
            _loc3_ = 1;
            _loc2_ = 1;
            _loc4_ = 50;
            if(§_-1i§ == §_-5G§)
            {
            }
         }
         else if(this.§_-v§ == 5)
         {
            §_-3h§.§_-3s§("backgroundmusic.mp3",0,1);
            if(§_-1i§ != §_-5G§)
            {
               §_-1k§ = §_-1i§;
            }
            else
            {
               §_-1k§ = override;
            }
            _loc1_ = 1.15;
            _loc3_ = 1;
            _loc2_ = 1;
            _loc4_ = 35;
            if(§_-1i§ == §_-5G§)
            {
            }
         }
         if(§_-1i§ == §_-1k§ && this.§_-v§ != 5)
         {
            §_-1k§ = §_-18§;
         }
         if(§_-1i§ == §_-5G§)
         {
            _loc1_ *= 1.1;
         }
         §const§ = §_-2W§.§_-55§(new §_-1k§(),MovieClip(this.§_-i§),500,§_-0o§);
         §const§.scaleX = -1;
         §const§.scaleX *= 1.25;
         §const§.scaleY *= 1.25;
         §_-h§(§const§).§case § = _loc1_;
         §_-h§(§const§).include = _loc3_;
         §_-h§(§const§).§do§ = _loc2_;
         §_-h§(§const§).§implements§ = _loc4_;
         §_-h§(§const§).§_-1T§ = _loc4_;
         §_-h§(§const§).§package§();
         if(§_-1i§ == §_-1k§)
         {
            if(§_-1k§ == override)
            {
               §_-h§(§const§).§_-2R§("*Pop?!*");
            }
            else if(§_-1k§ == §_-5P§)
            {
               §_-h§(§const§).§_-2R§("Grrr?!");
            }
            else
            {
               §_-h§(§const§).§_-2R§("So we meet again.");
            }
         }
         else
         {
            §_-h§(§const§).§each §();
         }
      }
      
      private function §_-3J§(param1:Event) : void
      {
         §_-1h§.setupServe();
      }
      
      private function §class§(param1:Number) : void
      {
         § try§.show();
         var _loc2_:FinishOverlay = §_-2W§.§_-55§(new FinishOverlay(param1),this,stage.stageWidth / 2,stage.stageHeight / 2);
      }
      
      private function §_-2D§(param1:Class) : void
      {
         var paperNum:Number = NaN;
         var thePlayerClass:Class = param1;
         §_-0v§.§_-31§ = false;
         § try§.show();
         if(this.§_-T§)
         {
            §_-6§.§_-1U§("FlawlessVictory",1);
         }
         if(§_-1i§ == §_-2Q§)
         {
            paperNum = 1;
         }
         else if(§_-1i§ == §_-18§)
         {
            paperNum = 2;
         }
         else if(§_-1i§ == §_-51§)
         {
            paperNum = 3;
         }
         else if(§_-1i§ == §_-0S§)
         {
            paperNum = 4;
         }
         else if(§_-1i§ == §_-2n§)
         {
            paperNum = 5;
         }
         else if(§_-1i§ == §use §)
         {
            paperNum = 6;
         }
         else if(§_-1i§ == §_-5P§)
         {
            paperNum = 7;
         }
         else if(§_-1i§ == §_-5G§)
         {
            paperNum = 8;
         }
         else if(§_-1i§ == override)
         {
            paperNum = 9;
         }
         §_-0v§.§_-03§(function():*
         {
            §_-2W§.§_-55§(new WinOverlay(paperNum),§_-0v§.§_-b§,0,0);
         },1,0.7,0);
      }
      
      private function §_-1y§() : void
      {
         §_-0v§.§_-31§ = false;
         § try§.show();
         §_-0v§.§_-03§(this.§_-C§,0.37,0.47,0);
      }
      
      private function §_-C§() : void
      {
         §_-2W§.§_-55§(new DeathScreen(§_-1i§),§_-0v§.§_-b§,0,0);
      }
      
      public function §_-43§(param1:Number) : void
      {
         if(§_-3P§)
         {
            §_-3h§.§true §("ding.mp3");
            §_-3P§ = false;
            if(param1 == 1)
            {
               ++this.§_-5M§;
               this.§_-58§ = 1;
            }
            else
            {
               ++this.§while§;
               this.§_-58§ = 2;
               this.§_-T§ = false;
            }
            if(this.§_-q§ != "multiplayer")
            {
               if(this.§_-5M§ < 7 && this.§while§ < 7)
               {
                  if(param1 == 1)
                  {
                     §_-h§(§const§).§_-5f§();
                  }
                  else
                  {
                     §_-h§(§const§).§_-3D§();
                  }
               }
               if(this.§_-5M§ >= 7)
               {
                  if(this.§_-v§ == 5)
                  {
                     setTimeout(this.§_-2D§,1500,§_-1i§);
                  }
                  else
                  {
                     this.§class§(2);
                  }
                  §_-28§ = true;
                  TextField(this.§_-4P§).text = "You Win";
                  this.§_-42§ = true;
                  §_-3h§.§true §("cheer.mp3");
                  §_-h§(§const§).§_-47§();
               }
               else if(this.§while§ >= 7)
               {
                  if(!§_-28§)
                  {
                     Log.LevelCounterMetric("DeathLevel",this.§_-v§,true);
                     setTimeout(this.§_-1y§,1000);
                  }
                  §_-28§ = true;
                  TextField(this.§_-4P§).text = "Good Try";
                  §_-3h§.§true §("sigh.mp3");
                  §_-h§(§const§).§_-5g§();
               }
               else
               {
                  setTimeout(this.§_-3F§,1500);
               }
            }
            if(this.§_-q§ == "multiplayer")
            {
               if(this.§_-5M§ >= 7 || this.§while§ >= 7)
               {
                  this.§class§(1);
                  §_-28§ = true;
                  this.§_-42§ = true;
                  §_-3h§.§true §("cheer.mp3");
                  if(this.§_-5M§ > this.§while§)
                  {
                     TextField(this.§_-4P§).text = "P1 Wins";
                  }
                  else
                  {
                     TextField(this.§_-4P§).text = "P2 Wins";
                  }
               }
               else
               {
                  setTimeout(this.§_-3F§,1500);
               }
            }
         }
      }
      
      private function §_-62§() : void
      {
         TextField(this.§_-4P§).text = this.§_-5M§ + " - " + this.§while§;
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(§_-1h§ != null)
         {
            §_-1h§.handleEnterFrame(param1);
         }
         if(§const§ != null)
         {
            §const§.handleEnterFrame(param1);
         }
         if(§_-3j§ != null)
         {
            §_-3j§.handleEnterFrame(param1);
         }
         if(!§_-28§)
         {
            this.§_-62§();
         }
         if(this.§_-42§)
         {
            if(§_-3e§.§_-3M§(70))
            {
               this.§_-0A§();
            }
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         stage.removeEventListener("keyPressedEsc",this.gotoMenu);
         SimpleButton(this.kongBtn).removeEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         MovieClip(this.§_-23§).removeEventListener(MouseEvent.MOUSE_OVER,this.§_-1Z§);
         MovieClip(this.§_-23§).removeEventListener(MouseEvent.MOUSE_OUT,this.§_-g§);
         MovieClip(this.mouseHitbox2).removeEventListener(MouseEvent.MOUSE_OVER,this.§_-1Z§);
         MovieClip(this.mouseHitbox2).removeEventListener(MouseEvent.MOUSE_OUT,this.§_-g§);
      }
   }
}

